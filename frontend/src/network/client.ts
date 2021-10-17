import { SignallingConnection } from "./signallingConnection";
import { Client, CONFIG, Message, MessageOptions, MESSAGE_TYPE, SignallingMessage, SIGNALLING_MESSAGE_TYPE, SOURCE_TYPE } from "./types";

export class NetworkClient extends SignallingConnection {
    clients: Client[] = [];
    serverChannel: RTCDataChannel | null = null;
    serverConn: RTCPeerConnection | null = null;
    candidates: RTCIceCandidate[] = [];
    clientId: string = "";

    sendMessage<K extends MESSAGE_TYPE>(type: K, data: MessageOptions[K]) {
        this.serverChannel?.send(JSON.stringify({ type: type, data: data }));
    }

    connect = async (sessionId: string) => {
        return new Promise<void>(async (resolve, reject) => {
            console.log("Connecting...");
            this.clientId = "";
            await this.signalingConnect();

            this.serverConn = new RTCPeerConnection(CONFIG);
            this.serverChannel = this.serverConn.createDataChannel("general", { negotiated: true, id: 0 });

            let makingOffer = false;
            let ignoreOffer = false;

            this.serverChannel.addEventListener("open", (event) => {
                console.log("OPENED");
                if (!this.serverConn || !this.serverChannel) return;
                console.log(`Client: Con: ${this.serverConn.connectionState}, ICE: ${this.serverConn.iceConnectionState}`);

                this.serverConn.onicecandidate = ({ candidate }) => {
                    if (candidate) {
                        this.sendMessage(MESSAGE_TYPE.ICE, { candidate: candidate });
                    }
                };

                this.serverConn.onnegotiationneeded = async () => {
                    if (!this.serverConn || !this.serverChannel) return;
                    console.log("New SDP Needed");
                    try {
                        makingOffer = true;
                        await this.serverConn.setLocalDescription();
                        if (this.serverConn.localDescription) {
                            let client = this.clients.find(client => client.id === this.clientId)!;
                            this.sendMessage(MESSAGE_TYPE.SOURCE_SYNC, {
                                description: this.serverConn.localDescription,
                                clients: [{ id: client.id, sources: client.sources.map((source) => { return { type: source.type, id: source.stream ? source.stream.id : "" }; }) }],
                            });
                        }
                    } catch (err) {
                        console.error(err);
                    } finally {
                        makingOffer = false;
                    }
                };
                console.log("Connected");
                this.sendMessage(MESSAGE_TYPE.JOIN, { id: this.clientId });
            });

            this.serverChannel.onmessage = async (event) => {
                if (!this.serverConn || !this.serverChannel) return;

                let data = JSON.parse(event.data);

                if (data.type === MESSAGE_TYPE.SOURCE_SYNC) {
                    const message = data as Message<MESSAGE_TYPE.SOURCE_SYNC>;

                    try {
                        const description = message.data.description;
                        const offerCollision = (description.type === "offer") &&
                            (makingOffer || this.serverConn.signalingState !== "stable");

                        ignoreOffer = offerCollision;
                        if (ignoreOffer) {
                            return;
                        }

                        console.log(`New remote SDP, Type: ${description.type}`);

                        await this.serverConn.setRemoteDescription(description);
                        if (description.type === "offer") {
                            await this.serverConn.setLocalDescription();
                            let client = this.clients.find(client => client.id === this.clientId)!;

                            // Update Sources
                            for (const serverClient of message.data.clients) {
                                if (serverClient.id === this.clientId) continue;

                                let clientClient = this.clients.find(client => client.id === serverClient.id);
                                if (!clientClient) continue;

                                clientClient.sources = serverClient.sources.map(serverSource => {
                                    let clientSource = clientClient!.sources.find(item => item.id === serverSource.id);
                                    return {
                                        type: serverSource.type,
                                        id: serverSource.id,
                                        stream: clientSource ? clientSource.stream : null
                                    };
                                });
                            }

                            if (this.serverConn.localDescription) {
                                this.sendMessage(MESSAGE_TYPE.SOURCE_SYNC, {
                                    description: this.serverConn.localDescription,
                                    clients: [{ id: client.id, sources: client.sources.map((source) => { return { type: source.type, id: source.stream ? source.stream.id : "" }; }) }],
                                });
                            }
                        }
                    } catch (err) {
                        console.error(err);
                    }
                } else if (data.type === MESSAGE_TYPE.ICE) {
                    const message = data as Message<MESSAGE_TYPE.ICE>;

                    try {
                        await this.serverConn.addIceCandidate(message.data.candidate);
                    } catch (err) {
                        if (!ignoreOffer) {
                            throw err;
                        }
                    }
                } else if (data.type === MESSAGE_TYPE.JOIN) {
                    const message = data as Message<MESSAGE_TYPE.JOIN>;

                    this.clients.push({ id: message.data.id, name: "", sources: [] });
                    if (message.data.id === this.clientId) {
                        resolve();
                    }
                    console.log("Client joined");
                } else if (data.type === MESSAGE_TYPE.LEAVE) {
                    const message = data as Message<MESSAGE_TYPE.LEAVE>;

                    let ind = this.clients.findIndex(client => client.id === message.data.id);
                    if (ind !== -1) {
                        this.clients.splice(ind, 1);
                        console.log("Client Left");
                    }
                }
            };

            this.serverConn.oniceconnectionstatechange = () => {
                if (this.serverConn?.iceConnectionState === "failed") {
                    this.serverConn.restartIce();
                }
            };

            this.serverConn.onicecandidate = ({ candidate }) => {
                if (!candidate) { return; }
                this.candidates.push(candidate);

                if (!this.clientId) { return; }

                // Flush candidates
                for (let i = 0; i < this.candidates.length; i++) {
                    this.signalingSend(SIGNALLING_MESSAGE_TYPE.ICE, { candidate: this.candidates[i] });
                }

                this.candidates.splice(0, this.candidates.length);
            };

            this.serverConn.ontrack = (event) => {
                this.onVideo(event);
            };

            await this.serverConn.setLocalDescription();
            this.signalingSend(SIGNALLING_MESSAGE_TYPE.CONNECT, { description: this.serverConn.localDescription!, id: sessionId });
        });
    };

    startScreenShare = () => {
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).then((captureStream) => {
            console.log("Stream:", captureStream);
            let client = this.clients.find(client => client.id === this.clientId)!;
            client.sources.push({ type: SOURCE_TYPE.SCREEN_SHARE, id: captureStream.id, stream: captureStream });
            for (const track of captureStream.getTracks()) {
                this.serverConn?.addTrack(track, captureStream);
            }
        });
    };

    startCamera = () => {
        navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then((captureStream) => {
            let client = this.clients.find(client => client.id === this.clientId)!;
            client.sources.push({ type: SOURCE_TYPE.CAMERA, id: captureStream.id, stream: captureStream });
            for (const track of captureStream.getTracks()) {
                this.serverConn?.addTrack(track, captureStream);
            }
        });
    };

    onVideo = (event: RTCTrackEvent) => {
    };

    onSignalingMessage = async (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.log(data);

        if (data.type === SIGNALLING_MESSAGE_TYPE.ICE) {
            const message = data as SignallingMessage<SIGNALLING_MESSAGE_TYPE.ICE>;
            await this.serverConn?.addIceCandidate(message.data.candidate);
        } else if (data.type === SIGNALLING_MESSAGE_TYPE.CONNECT) {
            const message = data as SignallingMessage<SIGNALLING_MESSAGE_TYPE.CONNECT>;
            if (!this.serverConn) return;

            this.clientId = message.data.id;

            // Flush candidates
            for (let i = 0; i < this.candidates.length; i++) {
                this.signalingSend(SIGNALLING_MESSAGE_TYPE.ICE, { candidate: this.candidates[i] });
            }

            this.candidates.splice(0, this.candidates.length);

            await this.serverConn.setRemoteDescription(message.data.description);
        }
    };
}