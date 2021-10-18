import { CONFIG, CoordinatorMessage, CoordinatorMessageOptions, COORDINATOR_MESSAGE_TYPE, Message, MessageOptions, MESSAGE_TYPE, NETWORK_STATE, ServerClient } from "./types";

export class NetworkServer {
    clients: ServerClient[] = [];
    sessionCreateResolve: ((code: string) => void) | null = null;
    coordinatorConnection: WebSocket | null = null;
    state: NETWORK_STATE = NETWORK_STATE.DISCONNECTED;

    coordinatorSend<K extends COORDINATOR_MESSAGE_TYPE>(type: K, event: CoordinatorMessageOptions[K], id: string = "") {
        if (this.coordinatorConnection && this.coordinatorConnection.readyState === this.coordinatorConnection.OPEN) {
            this.coordinatorConnection.send(JSON.stringify({ id: id, type: type, data: event }));
        }
    }

    isStarted = () => {
        return this.state !== NETWORK_STATE.DISCONNECTED;
    };

    async start() {
        return new Promise<string>(async (resolve, reject) => {
            if (this.isStarted()) { return reject(new Error("Server already started")); }
            this.state = NETWORK_STATE.COORDINATOR_CONNECTING;
            this.sessionCreateResolve = resolve;

            this.coordinatorConnection = new WebSocket(process.env.REACT_APP_WS_URL!);

            this.coordinatorConnection.onmessage = this.onCoordinatorMessage;

            this.coordinatorConnection.onclose = () => {
                console.log("Coordinator Closed");
                if (this.state !== NETWORK_STATE.DISCONNECTED) {
                    reject();
                }
            };

            this.coordinatorConnection.onerror = (error) => {
                console.error("onerror", error);
                reject(error);
            };

            this.coordinatorConnection.onopen = () => {
                console.log("Coordinator Opened");
                this.state = NETWORK_STATE.CONNECTING;
                this.coordinatorSend(COORDINATOR_MESSAGE_TYPE.SESSION_CREATE, { id: "" });
            };
        });
    }

    sendMessage<K extends MESSAGE_TYPE>(type: K, data: MessageOptions[K], client: ServerClient) {
        client.dataChannel.send(JSON.stringify({ type: type, data: data }));
    }

    onClient = (client: ServerClient) => {
        client.dataChannel.addEventListener("open", (event) => {
            console.log(`Server: Con: ${client.pc.connectionState}, ICE: ${client.pc.iceConnectionState}, COORDINAT: ${client.pc.signalingState}}`);

            client.pc.onicecandidate = ({ candidate }) => {
                if (candidate) {
                    this.sendMessage(MESSAGE_TYPE.ICE, { candidate: candidate }, client);
                }
            };

            client.pc.onnegotiationneeded = async () => {
                try {
                    await client.pc.setLocalDescription();
                    if (client.pc.localDescription) {
                        this.sendMessage(MESSAGE_TYPE.SOURCE_SYNC, {
                            description: client.pc.localDescription,
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

        client.dataChannel.onmessage = async (event) => {
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

                    await client.pc.setRemoteDescription(description);
                    if (description.type === "offer") {
                        await client.pc.setLocalDescription();
                        if (client.pc.localDescription) {
                            console.log(message.data);

                            this.sendMessage(MESSAGE_TYPE.SOURCE_SYNC, {
                                description: client.pc.localDescription,
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
                    await client.pc.addIceCandidate(message.data.candidate);
                } catch (err) {
                    throw err;
                }
            } else if (data.type === MESSAGE_TYPE.JOIN) {
                // Trigger join messages for new client
                for (const serverClient of this.clients) {
                    if (serverClient.state !== NETWORK_STATE.CONNECTED) continue;
                    this.sendMessage(MESSAGE_TYPE.JOIN, { id: serverClient.id }, client);
                }

                client.state = NETWORK_STATE.CONNECTED;

                // Trigger join message for all clients
                for (const serverClient of this.clients) {
                    if (serverClient.state !== NETWORK_STATE.CONNECTED) continue;
                    this.sendMessage(MESSAGE_TYPE.JOIN, { id: client.id }, serverClient);
                }

                // Update tracks of new client
                for (const serverClient of this.clients) {
                    if (serverClient.state !== NETWORK_STATE.CONNECTED || serverClient.id === client.id) continue;
                    for (const source of serverClient.sources) {
                        if (!source.stream) continue;
                        for (const track of source.stream.getTracks()) {
                            client.pc.addTrack(track, source.stream);
                        }
                    }
                }
            } else if (data.type === MESSAGE_TYPE.LEAVE) {
                // client.ready = false;
                // DISCONNECT
                // this.clients.splice();

                for (const client of this.clients) {
                    if (client.state !== NETWORK_STATE.CONNECTED) continue;
                    this.sendMessage(MESSAGE_TYPE.LEAVE, { id: client.id }, client);
                }
            }
        };

        client.pc.ontrack = (event) => {
            console.log("New Track", client);
            let source = client.sources.find(source => source.id === event.streams[0].id);
            if (source) {
                source.stream = event.streams[0];

                for (const serverClient of this.clients) {
                    if (serverClient.state !== NETWORK_STATE.CONNECTED || serverClient.id === client.id) continue;
                    serverClient.pc.addTrack(event.track, event.streams[0]);
                }
            }
        };
    };

    removeBandwidthRestriction(description: RTCSessionDescription): RTCSessionDescription {
        return {
            type: description.type,
            sdp: description.sdp.replace(/b=AS:.*\r\n/, '').replace(/b=TIAS:.*\r\n/, ''),
        } as RTCSessionDescription;
    }

    onCoordinatorMessage = async (event: MessageEvent) => {
        const data = JSON.parse(event.data);

        if (data.type === COORDINATOR_MESSAGE_TYPE.CONNECT) {
            const message = data as CoordinatorMessage<COORDINATOR_MESSAGE_TYPE.CONNECT>;

            let pc = new RTCPeerConnection(CONFIG);
            let dataChannel = pc.createDataChannel("general", { negotiated: true, id: 0, });
            let candidates: RTCIceCandidate[] = [];

            // Create new client
            let client: ServerClient = { name: "", state: NETWORK_STATE.COORDINATOR_CONNECTED, sources: [], pc: pc, id: String(Math.floor(Math.random() * 999999)).padStart(6, "0"), dataChannel: dataChannel };
            this.clients.push(client);

            this.onClient(client);

            pc.oniceconnectionstatechange = () => {
                if (pc.iceConnectionState === "failed") {
                    pc.restartIce();
                }
            };

            pc.onicecandidate = ({ candidate }) => {
                if (!candidate) { return; }
                candidates.push(candidate);

                if (client.state === NETWORK_STATE.COORDINATOR_CONNECTED) { return; }

                // Flush candidates
                for (let i = 0; i < candidates.length; i++) {
                    this.coordinatorSend(COORDINATOR_MESSAGE_TYPE.ICE, { candidate: candidates[i] }, client.id);
                }
                candidates.splice(0, candidates.length);
            };

            // Create answer
            await pc.setRemoteDescription(message.data.description);
            await pc.setLocalDescription();
            if (!pc.localDescription) return;

            this.coordinatorSend(COORDINATOR_MESSAGE_TYPE.CONNECT, { description: this.removeBandwidthRestriction(pc.localDescription), id: client.id }, message.id);
            if (client.state === NETWORK_STATE.CONNECTING) { return; }

            // Flush candidates
            for (let i = 0; i < candidates.length; i++) {
                this.coordinatorSend(COORDINATOR_MESSAGE_TYPE.ICE, { candidate: candidates[i] }, client.id);
            }
            candidates.splice(0, candidates.length);
        } else if (data.type === COORDINATOR_MESSAGE_TYPE.ICE) {
            const message = data as CoordinatorMessage<COORDINATOR_MESSAGE_TYPE.ICE>;

            for (let i = 0; i < this.clients.length; i++) {
                if (this.clients[i].id === message.id) {
                    console.log("ADDED");
                    await this.clients[i].pc.addIceCandidate(message.data.candidate);
                    break;
                }
            }
        } else if (data.type === COORDINATOR_MESSAGE_TYPE.SESSION_CREATE) {
            const message = data as CoordinatorMessage<COORDINATOR_MESSAGE_TYPE.SESSION_CREATE>;
            this.state = NETWORK_STATE.CONNECTED;
            if (this.sessionCreateResolve) {
                this.sessionCreateResolve(message.data.id);
            }
        }
    };
}