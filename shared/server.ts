import { Client, CONFIG, CoordinatorMessage, CoordinatorMessageOptions, COORDINATOR_MESSAGE_TYPE, Message, MessageOptions, MESSAGE_TYPE, NETWORK_STATE, ServerClient } from "./types";

export class NetworkServer {
    //#region Public Attributes
    public clients: ServerClient[] = [];
    public state: NETWORK_STATE = NETWORK_STATE.DISCONNECTED;
    //#endregion

    //#region Private Attributes
    private coordinatorConnection: WebSocket | null = null;
    private sessionCreateResolve: ((code: string) => void) | null = null;
    //#endregion

    //#region Public Methods
    public async start(id: string = "") {
        return new Promise<string>(async (resolve, reject) => {
            if (this.isStarted()) { return reject(new Error("Server already started")); }
            this.setState(NETWORK_STATE.COORDINATOR_CONNECTING);
            this.sessionCreateResolve = resolve;

            //@ts-ignore
            this.coordinatorConnection = new WebSocket(process.env.REACT_APP_COORDINATOR_URL!);

            this.coordinatorConnection.onmessage = this.onCoordinatorMessage;

            this.coordinatorConnection.onclose = () => {
                if (this.state !== NETWORK_STATE.DISCONNECTED) {
                    reject();
                }
            };

            this.coordinatorConnection.onerror = (error) => {
                console.error("onerror", error);
                reject(error);
            };

            this.coordinatorConnection.onopen = () => {
                this.setState(NETWORK_STATE.COORDINATOR_CONNECTED);
                this.setState(NETWORK_STATE.CONNECTING);
                this.coordinatorSend(COORDINATOR_MESSAGE_TYPE.SESSION_CREATE, { id: id });
            };
        });
    }

    public stop() {
        if (this.coordinatorConnection && !this.coordinatorConnection.CLOSED)
            this.coordinatorConnection.close();

        if (this.state !== NETWORK_STATE.CONNECTED) return;

        this.sendMessage(MESSAGE_TYPE.LEAVE, { id: "" });

        // Cleanup
        for (const client of this.clients) {
            client.pc.close();
        }

        this.clients.splice(0, this.clients.length);

        this.setState(NETWORK_STATE.DISCONNECTED);
    }

    public isStarted = () => {
        return this.state !== NETWORK_STATE.DISCONNECTED;
    };
    //#endregion

    //#region Public Callbacks
    public onNetworkStateChange = (state: NETWORK_STATE) => { };
    //#endregion

    //#region Private Methods
    private coordinatorSend<K extends COORDINATOR_MESSAGE_TYPE>(type: K, event: CoordinatorMessageOptions[K], id: string = "") {
        if (this.coordinatorConnection && this.coordinatorConnection.readyState === this.coordinatorConnection.OPEN) {
            this.coordinatorConnection.send(JSON.stringify({ id: id, type: type, data: event }));
        }
    }

    private sendMessage<K extends MESSAGE_TYPE>(type: K, data: MessageOptions[K], client: ServerClient | null = null) {
        if (!client) {
            for (const serverClient of this.clients) {
                if (serverClient.state !== NETWORK_STATE.CONNECTED || serverClient.dataChannel.readyState !== "open") continue;
                serverClient.dataChannel.send(JSON.stringify({ type: type, data: data }));
            }
        } else {
            if (client.dataChannel.readyState === "open")
                client.dataChannel.send(JSON.stringify({ type: type, data: data }));
        }
    }

    private setState = (state: NETWORK_STATE) => {
        this.state = state;
        this.onNetworkStateChange(state);
    };

    private removeBandwidthRestriction(description: RTCSessionDescription): RTCSessionDescription {
        return {
            type: description.type,
            sdp: description.sdp
                .replace(/a=mid:audio\r\n/g, `a=mid:audio\r\nb=AS:${256}\r\n`)
                .replace(/a=mid:video\r\n/g, `a=mid:video\r\nb=AS:${10000}\r\n`)
        } as RTCSessionDescription;
    }

    private disconnectClient(client: Client) {
        if (client.state === NETWORK_STATE.DISCONNECTED) return;

        client.state = NETWORK_STATE.DISCONNECTED;

        for (const source of client.sources) {
            if (!source.stream) continue;
            for (const track of source.stream.getTracks()) {
                track.stop();
            }
        }

        this.sendMessage(MESSAGE_TYPE.LEAVE, { id: client.id });

        let ind = this.clients.findIndex(item => item.id === client.id);
        if (ind !== -1)
            this.clients.splice(ind, 1);
    }
    //#endregion

    //#region Private Callbacks
    private onClient(client: ServerClient) {
        client.dataChannel.addEventListener("open", (event) => {
            client.pc.onicecandidate = ({ candidate }) => {
                if (candidate) {
                    this.sendMessage(MESSAGE_TYPE.ICE, { candidate: candidate }, client);
                }
            };

            client.pc.onnegotiationneeded = async () => {
                try {
                    await client.pc.setLocalDescription(await client.pc.createOffer());
                    if (client.pc.localDescription) {
                        this.sendMessage(MESSAGE_TYPE.SDP, { description: client.pc.localDescription }, client);
                    }
                } catch (err) {
                    console.error(err);
                }
            };
        });

        client.dataChannel.onmessage = async (event) => {
            let data = JSON.parse(event.data);

            if (data.type === MESSAGE_TYPE.ADD_SOURCE) {
                const message = data as Message<MESSAGE_TYPE.ADD_SOURCE>;

                // Sanity Check
                let oldSource = client.sources.findIndex(item => item.id === message.data.source.id);
                if (oldSource !== -1) return;

                client.sources.push({
                    id: message.data.source.id,
                    type: message.data.source.type,
                    stream: null
                });

                this.sendMessage(MESSAGE_TYPE.ADD_SOURCE, {
                    client: client.id,
                    source: {
                        id: message.data.source.id,
                        type: message.data.source.type
                    }
                });
            } else if (data.type === MESSAGE_TYPE.REMOVE_SOURCE) {
                const message = data as Message<MESSAGE_TYPE.REMOVE_SOURCE>;

                let oldSource = client.sources.findIndex(item => item.id === message.data.source);

                // Sanity Check
                if (oldSource === -1) return;

                client.sources.splice(oldSource, 1);

                this.sendMessage(MESSAGE_TYPE.REMOVE_SOURCE, { client: client.id, source: message.data.source });
            } else if (data.type === MESSAGE_TYPE.SDP) {
                const message = data as Message<MESSAGE_TYPE.SDP>;

                try {
                    const description = message.data.description;

                    await client.pc.setRemoteDescription(description);
                    if (description.type === "offer") {
                        await client.pc.setLocalDescription(await client.pc.createAnswer());
                        if (client.pc.localDescription) {
                            this.sendMessage(MESSAGE_TYPE.SDP, { description: client.pc.localDescription }, client);
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
                const message = data as Message<MESSAGE_TYPE.JOIN>;

                // Trigger join messages for new client
                for (const serverClient of this.clients) {
                    if (serverClient.state !== NETWORK_STATE.CONNECTED) continue;
                    this.sendMessage(MESSAGE_TYPE.JOIN, { id: serverClient.id, name: serverClient.name }, client);
                }

                client.state = NETWORK_STATE.CONNECTED;
                client.name = message.data.name;

                // Trigger join message for all clients
                this.sendMessage(MESSAGE_TYPE.JOIN, { id: client.id, name: client.name });

                // Update Sources of new client
                for (const serverClient of this.clients) {
                    if (serverClient.state !== NETWORK_STATE.CONNECTED || serverClient.id === client.id) continue;
                    for (const source of serverClient.sources) {
                        this.sendMessage(MESSAGE_TYPE.ADD_SOURCE, {
                            client: serverClient.id,
                            source: {
                                id: source.id,
                                type: source.type
                            }
                        }, client);

                        if (!source.stream) continue;
                        for (const track of source.stream.getTracks()) {
                            client.pc.addTrack(track, source.stream);
                        }
                    }
                }
            } else if (data.type === MESSAGE_TYPE.LEAVE) {
                this.disconnectClient(client);
            }
        };

        client.pc.ontrack = (event) => {
            for (const clientSource of event.streams) {
                let source = client.sources.find(source => source.id === clientSource.id);
                if (!source) continue;

                source.stream = clientSource;

                for (const serverClient of this.clients) {
                    if (serverClient.state !== NETWORK_STATE.CONNECTED || serverClient.id === client.id) continue;
                    serverClient.pc.addTrack(event.track, clientSource);
                }
            }
        };
    };

    private onCoordinatorMessage = async (event: MessageEvent) => {
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
                    //@ts-ignore
                    pc.restartIce();
                } else if (pc.iceConnectionState == 'disconnected') {
                    this.disconnectClient(client);
                }
            };

            pc.onicecandidate = ({ candidate }) => {
                if (!candidate) { return; }
                candidates.push(candidate);

                if (client.state < NETWORK_STATE.CONNECTING) { return; }

                // Flush candidates
                for (let i = 0; i < candidates.length; i++) {
                    this.coordinatorSend(COORDINATOR_MESSAGE_TYPE.ICE, { candidate: candidates[i] }, client.id);
                }
                candidates.splice(0, candidates.length);
            };

            // Create answer
            await pc.setRemoteDescription(message.data.description);
            await pc.setLocalDescription(await client.pc.createAnswer());
            if (!pc.localDescription) return;

            this.coordinatorSend(COORDINATOR_MESSAGE_TYPE.CONNECT, { description: this.removeBandwidthRestriction(pc.localDescription), id: client.id }, message.id);
            client.state = NETWORK_STATE.CONNECTING;

            // Flush candidates
            for (let i = 0; i < candidates.length; i++) {
                this.coordinatorSend(COORDINATOR_MESSAGE_TYPE.ICE, { candidate: candidates[i] }, client.id);
            }
            candidates.splice(0, candidates.length);
        } else if (data.type === COORDINATOR_MESSAGE_TYPE.ICE) {
            const message = data as CoordinatorMessage<COORDINATOR_MESSAGE_TYPE.ICE>;

            for (let i = 0; i < this.clients.length; i++) {
                if (this.clients[i].id === message.id) {
                    await this.clients[i].pc.addIceCandidate(message.data.candidate);
                    break;
                }
            }
        } else if (data.type === COORDINATOR_MESSAGE_TYPE.SESSION_CREATE) {
            const message = data as CoordinatorMessage<COORDINATOR_MESSAGE_TYPE.SESSION_CREATE>;
            this.setState(NETWORK_STATE.CONNECTED);
            if (this.sessionCreateResolve) {
                this.sessionCreateResolve(message.data.id);
            }
        }
    };
    //#endregion
}