import { Client, CONFIG, CoordinatorMessage, CoordinatorMessageOptions, COORDINATOR_MESSAGE_TYPE, Message, MessageOptions, MESSAGE_TYPE, NETWORK_STATE, Source, SOURCE_TYPE } from "./types";

export class NetworkClient {
    clients: Client[] = [];
    serverChannel: RTCDataChannel | null = null;
    serverConn: RTCPeerConnection | null = null;
    candidates: RTCIceCandidate[] = [];
    id: string = "";
    state: NETWORK_STATE = NETWORK_STATE.DISCONNECTED;
    coordinatorConnection: WebSocket | null = null;

    coordinatorSend<K extends COORDINATOR_MESSAGE_TYPE>(type: K, event: CoordinatorMessageOptions[K], id: string = "") {
        if (this.coordinatorConnection && this.coordinatorConnection.readyState === this.coordinatorConnection.OPEN) {
            this.coordinatorConnection.send(JSON.stringify({ id: id, type: type, data: event }));
        }
    }

    sendMessage<K extends MESSAGE_TYPE>(type: K, data: MessageOptions[K]) {
        this.serverChannel?.send(JSON.stringify({ type: type, data: data }));
    }

    onServer = (resolve: () => void) => {
        if (!this.serverChannel) return;

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
                        let client = this.clients.find(client => client.id === this.id)!;
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

            this.sendMessage(MESSAGE_TYPE.JOIN, { id: this.id });
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
                        let client = this.clients.find(client => client.id === this.id)!;

                        // Update Sources
                        for (const serverClient of message.data.clients) {
                            if (serverClient.id === this.id) continue;

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

                this.clients.push({ id: message.data.id, name: "", sources: [], state: NETWORK_STATE.CONNECTED });
                if (message.data.id === this.id) {
                    this.state = NETWORK_STATE.CONNECTED;
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
    };

    removeBandwidthRestriction(description: RTCSessionDescription): RTCSessionDescription {
        return {
            type: description.type,
            sdp: description.sdp.replace(/b=AS:.*\r\n/, '').replace(/b=TIAS:.*\r\n/, ''),
        } as RTCSessionDescription;
    }

    startScreenShare = async () => {
        let captureStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        console.log("Stream:", captureStream);

        let client = this.clients.find(client => client.id === this.id)!;
        let source: Source = { type: SOURCE_TYPE.SCREEN_SHARE, id: captureStream.id, stream: captureStream };
        client.sources.push(source);

        for (const track of captureStream.getTracks()) {
            this.serverConn?.addTrack(track, captureStream);
        }

        this.onClientsChanged(this.clients);

        return source;
    };

    startCamera = async () => {
        let captureStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log("Stream:", captureStream);

        let client = this.clients.find(client => client.id === this.id)!;
        let source: Source = { type: SOURCE_TYPE.CAMERA, id: captureStream.id, stream: captureStream };
        client.sources.push(source);

        for (const track of captureStream.getTracks()) {
            this.serverConn?.addTrack(track, captureStream);
        }

        this.onClientsChanged(this.clients);

        return source;
    };

    isStarted = () => {
        return this.state !== NETWORK_STATE.DISCONNECTED;
    };

    onClientsChanged = (clients: Client[]) => { };

    connect = async (sessionId: string) => {
        return new Promise<void>(async (resolve, reject) => {
            if (this.isStarted()) { return reject(new Error("Client already started")); }
            this.state = NETWORK_STATE.COORDINATOR_CONNECTING;

            this.coordinatorConnection = new WebSocket(process.env.REACT_APP_WS_URL!);

            this.coordinatorConnection.onmessage = this.onCoordinatorMessage;

            this.coordinatorConnection.onclose = () => {
                console.log("Coordinator Closed");
                if (this.state !== NETWORK_STATE.CONNECTED) {
                    reject();
                }
            };

            this.coordinatorConnection.onerror = (error) => {
                console.error("onerror", error);
                reject(error);
            };

            this.coordinatorConnection.onopen = async () => {
                console.log("Coordinator Opened");

                this.state = NETWORK_STATE.COORDINATOR_CONNECTED;
                this.serverConn = new RTCPeerConnection(CONFIG);
                this.serverChannel = this.serverConn.createDataChannel("general", { negotiated: true, id: 0 });

                this.onServer(resolve);

                this.serverConn.oniceconnectionstatechange = () => {
                    if (this.serverConn?.iceConnectionState === "failed") {
                        this.serverConn.restartIce();
                    }
                };

                this.serverConn.onicecandidate = ({ candidate }) => {
                    if (!candidate) { return; }
                    this.candidates.push(candidate);

                    if (this.state !== NETWORK_STATE.CONNECTING) { return; }

                    // Flush candidates
                    for (let i = 0; i < this.candidates.length; i++) {
                        this.coordinatorSend(COORDINATOR_MESSAGE_TYPE.ICE, { candidate: this.candidates[i] });
                    }

                    this.candidates.splice(0, this.candidates.length);
                };

                this.serverConn.ontrack = (event) => {
                    // event
                    // this.onSourceAdded();
                };

                await this.serverConn.setLocalDescription();
                this.coordinatorSend(COORDINATOR_MESSAGE_TYPE.CONNECT, { description: this.removeBandwidthRestriction(this.serverConn.localDescription!), id: sessionId });
            };
        });
    };

    onCoordinatorMessage = async (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.log(data);

        if (data.type === COORDINATOR_MESSAGE_TYPE.ICE) {
            const message = data as CoordinatorMessage<COORDINATOR_MESSAGE_TYPE.ICE>;
            await this.serverConn?.addIceCandidate(message.data.candidate);
        } else if (data.type === COORDINATOR_MESSAGE_TYPE.CONNECT) {
            const message = data as CoordinatorMessage<COORDINATOR_MESSAGE_TYPE.CONNECT>;
            if (!this.serverConn) return;

            this.id = message.data.id;
            this.state = NETWORK_STATE.CONNECTING;

            // Flush candidates
            for (let i = 0; i < this.candidates.length; i++) {
                this.coordinatorSend(COORDINATOR_MESSAGE_TYPE.ICE, { candidate: this.candidates[i] });
            }

            this.candidates.splice(0, this.candidates.length);

            await this.serverConn.setRemoteDescription(message.data.description);
        }
    };
}