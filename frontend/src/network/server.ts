import { SignallingConnection } from "./signallingConnection";
import { CONFIG, Message, MessageOptions, MESSAGE_TYPE, ServerClient, SignallingMessage, SIGNALLING_MESSAGE_TYPE } from "./types";

export class NetworkServer extends SignallingConnection {
    clients: ServerClient[] = [];
    sessionCreateResolve: ((code: string) => void) | null = null;

    async start() {
        return new Promise<string>(async (resolve, reject) => {
            this.sessionCreateResolve = resolve;
            await this.signalingConnect();
            this.signalingSend(SIGNALLING_MESSAGE_TYPE.SESSION_CREATE, { id: "" });
        });
    }

    sendMessage<K extends MESSAGE_TYPE>(type: K, data: MessageOptions[K], client: ServerClient) {
        client.dataChannel.send(JSON.stringify({ type: type, data: data }));
    }

    onSignalingMessage = async (event: MessageEvent) => {
        const data = JSON.parse(event.data);

        if (data.type === SIGNALLING_MESSAGE_TYPE.CONNECT) {
            const message = data as SignallingMessage<SIGNALLING_MESSAGE_TYPE.CONNECT>;

            let pc = new RTCPeerConnection(CONFIG);
            let dataChannel = pc.createDataChannel("general", { negotiated: true, id: 0, });
            let candidates: RTCIceCandidate[] = [];
            let signallingConnected = false;

            // Create new client
            let client: ServerClient = { name: "", ready: false, sources: [], pc: pc, id: String(Math.floor(Math.random() * 999999)).padStart(6, "0"), dataChannel: dataChannel };
            this.clients.push(client);

            dataChannel.addEventListener("open", (event) => {
                console.log(`Server: Con: ${pc.connectionState}, ICE: ${pc.iceConnectionState}, SIGNAL: ${pc.signalingState}}`);

                pc.onicecandidate = ({ candidate }) => {
                    if (candidate) {
                        this.sendMessage(MESSAGE_TYPE.ICE, { candidate: candidate }, client);
                    }
                };

                pc.onnegotiationneeded = async () => {
                    try {
                        await pc.setLocalDescription();
                        if (pc.localDescription) {
                            this.sendMessage(MESSAGE_TYPE.SOURCE_SYNC, {
                                description: pc.localDescription,
                                clients: this.clients.map(client => {
                                    return {
                                        id: client.id,
                                        sources: client.sources.map(source => { return { type: source.type, id: source.id }; })
                                    };
                                }),
                            }, client);
                        }
                    } catch (err) {
                        console.error(err);
                    }
                };
            });

            dataChannel.onmessage = async (event) => {
                let data = JSON.parse(event.data);

                if (data.type === MESSAGE_TYPE.SOURCE_SYNC) {
                    const message = data as Message<MESSAGE_TYPE.SOURCE_SYNC>;

                    try {
                        const description = message.data.description;

                        console.log(`New remote SDP, Type: ${description.type}`);

                        if (description.type === "offer") {
                            // Update Sources
                            client.sources = message.data.clients[0].sources.map(source => {
                                let old = client.sources.find(item => item.id === source.id);
                                return {
                                    id: source.id,
                                    type: source.type,
                                    stream: old ? old.stream : null
                                };
                            });
                        }

                        await pc.setRemoteDescription(description);
                        if (description.type === "offer") {
                            await pc.setLocalDescription();
                            if (pc.localDescription) {
                                console.log(message.data);

                                this.sendMessage(MESSAGE_TYPE.SOURCE_SYNC, {
                                    description: pc.localDescription,
                                    clients: this.clients.map(client => {
                                        return {
                                            id: client.id,
                                            sources: client.sources.map(source => { return { type: source.type, id: source.id }; })
                                        };
                                    }),
                                }, client);
                            }
                        }
                    } catch (err) {
                        console.error(err);
                    }
                } else if (data.type === MESSAGE_TYPE.ICE) {
                    const message = data as Message<MESSAGE_TYPE.ICE>;

                    try {
                        await pc.addIceCandidate(message.data.candidate);
                    } catch (err) {
                        throw err;
                    }
                } else if (data.type === MESSAGE_TYPE.JOIN) {
                    for (const serverClient of this.clients) {
                        if (!serverClient.ready) continue;
                        this.sendMessage(MESSAGE_TYPE.JOIN, { id: serverClient.id }, client);
                    }

                    client.ready = true;

                    for (const serverClient of this.clients) {
                        if (!serverClient.ready) continue;
                        this.sendMessage(MESSAGE_TYPE.JOIN, { id: client.id }, serverClient);
                    }

                    for (const serverClient of this.clients) {
                        if (!serverClient.ready) continue;
                        for (const source of serverClient.sources) {
                            if (!source.stream) continue;
                            for (const track of source.stream.getTracks()) {
                                client.pc.addTrack(track, source.stream);
                            }
                        }
                    }
                } else if (data.type === MESSAGE_TYPE.LEAVE) {
                    client.ready = false;

                    for (const client of this.clients) {
                        if (!client.ready) continue;
                        this.sendMessage(MESSAGE_TYPE.LEAVE, { id: client.id }, client);
                    }
                }
            };

            pc.ontrack = (event) => {
                console.log("New Track", client);
                let source = client.sources.find(source => source.id === event.streams[0].id);
                if (source) {
                    source.stream = event.streams[0];

                    for (const client of this.clients) {
                        if (!client.ready) continue;
                        client.pc.addTrack(event.track, event.streams[0]);
                    }
                }
            };

            pc.oniceconnectionstatechange = () => {
                if (pc.iceConnectionState === "failed") {
                    pc.restartIce();
                }
            };

            pc.onicecandidate = ({ candidate }) => {
                if (!candidate) { return; }
                candidates.push(candidate);

                if (!signallingConnected) { return; }

                // Flush candidates
                for (let i = 0; i < candidates.length; i++) {
                    this.signalingSend(SIGNALLING_MESSAGE_TYPE.ICE, { candidate: candidates[i] }, client.id);
                }
                candidates.splice(0, candidates.length);
            };

            // Create answer
            await pc.setRemoteDescription(message.data.description);
            await pc.setLocalDescription();
            if (!pc.localDescription) return;

            this.signalingSend(SIGNALLING_MESSAGE_TYPE.CONNECT, { description: pc.localDescription, id: client.id }, message.id);
            signallingConnected = true;

            // Flush candidates
            for (let i = 0; i < candidates.length; i++) {
                this.signalingSend(SIGNALLING_MESSAGE_TYPE.ICE, { candidate: candidates[i] }, client.id);
            }
            candidates.splice(0, candidates.length);
        } else if (data.type === SIGNALLING_MESSAGE_TYPE.ICE) {
            const message = data as SignallingMessage<SIGNALLING_MESSAGE_TYPE.ICE>;

            for (let i = 0; i < this.clients.length; i++) {
                if (this.clients[i].id === message.id) {
                    console.log("ADDED");
                    await this.clients[i].pc.addIceCandidate(message.data.candidate);
                    break;
                }
            }
        } else if (data.type === SIGNALLING_MESSAGE_TYPE.SESSION_CREATE) {
            const message = data as SignallingMessage<SIGNALLING_MESSAGE_TYPE.SESSION_CREATE>;
            if (this.sessionCreateResolve) {
                this.sessionCreateResolve(message.data.id);
            }
        }
    };
}