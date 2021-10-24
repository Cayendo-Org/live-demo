import { Client, CONFIG, CoordinatorMessage, CoordinatorMessageOptions, COORDINATOR_MESSAGE_TYPE, Message, MessageOptions, MESSAGE_TYPE, NETWORK_STATE, Source, SOURCE_TYPE } from "./types";

export class NetworkClient {
    //#region Public Attributes
    public id: string = "";
    public name: string = "";
    public state: NETWORK_STATE = NETWORK_STATE.DISCONNECTED;
    public clients: Client[] = [];
    //#endregion Private Attributes

    //#region Private Attributes
    private serverChannel: RTCDataChannel | null = null;
    private serverConn: RTCPeerConnection | null = null;
    private candidates: RTCIceCandidate[] = [];
    private coordinatorConnection: WebSocket | null = null;
    private unassignedStreams: MediaStream[] = [];
    //#endregion

    //#region Public Methods
    public connect = async (sessionId: string, name: string) => {
        return new Promise<void>(async (resolve, reject) => {
            if (this.isStarted()) { return reject(new Error("Client already started")); }
            this.setState(NETWORK_STATE.COORDINATOR_CONNECTING);
            this.name = name;

            //@ts-ignore
            this.coordinatorConnection = new WebSocket(process.env.REACT_APP_COORDINATOR_URL!);

            this.coordinatorConnection.onmessage = this.onCoordinatorMessage;

            this.coordinatorConnection.onclose = () => {
                if (this.state !== NETWORK_STATE.CONNECTING) {
                    this.disconnect();
                    reject();
                }
            };

            this.coordinatorConnection.onerror = (error) => {
                console.error("onerror", error);
                reject(error);
            };

            this.coordinatorConnection.onopen = async () => {
                this.setState(NETWORK_STATE.COORDINATOR_CONNECTED);
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

                    if (this.state < NETWORK_STATE.CONNECTING) { return; }

                    // Flush candidates
                    for (let i = 0; i < this.candidates.length; i++) {
                        this.coordinatorSend(COORDINATOR_MESSAGE_TYPE.ICE, { candidate: this.candidates[i] });
                    }

                    this.candidates.splice(0, this.candidates.length);
                };

                this.serverConn.ontrack = (event) => {
                    // Push onto unassigned streams
                    let changed = false;
                    for (const serverStream of event.streams) {
                        let stream = this.unassignedStreams.find(item => item.id === serverStream.id);
                        if (!stream) {
                            this.unassignedStreams.push(serverStream);
                            changed = true;
                        }
                    }

                    if (changed) {
                        this.assignStreams();
                    }
                };

                this.serverConn.oniceconnectionstatechange = () => {
                    if (!this.serverConn) return;

                    if (this.serverConn.iceConnectionState === "failed") {
                        this.serverConn.restartIce();
                    } else if (this.serverConn.iceConnectionState == 'disconnected') {
                        this.disconnect();
                    }
                };

                await this.serverConn.setLocalDescription(await this.serverConn.createOffer());
                this.coordinatorSend(COORDINATOR_MESSAGE_TYPE.CONNECT, { description: this.removeBandwidthRestriction(this.serverConn.localDescription!), id: sessionId });
            };
        });
    };

    public disconnect() {
        if (this.coordinatorConnection && !this.coordinatorConnection.CLOSED)
            this.coordinatorConnection.close();

        if (!this.serverConn) return;

        if (this.state === NETWORK_STATE.CONNECTED) {
            this.stopCamera();
            this.stopMicrophone();
            this.stopScreenShare();

            this.sendMessage(MESSAGE_TYPE.LEAVE, { id: this.id });
        }

        // Cleanup
        this.serverConn.close();
        this.serverConn = null;
        this.clients.splice(0, this.clients.length);

        this.setState(NETWORK_STATE.DISCONNECTED);

        this.onClientsChanged(this.clients);
    }

    public startCamera = async () => {
        // Sanity Checks
        if (this.state !== NETWORK_STATE.CONNECTED) throw new Error("Not Connected");
        let client = this.clients.find(client => client.id === this.id)!;
        if (client.sources.find(source => source.type === SOURCE_TYPE.CAMERA)) throw new Error("Camera already started");

        let captureStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

        // Add Source
        let source: Source = { type: SOURCE_TYPE.CAMERA, id: captureStream.id, stream: captureStream };
        this.addSource(source);
        return source;
    };

    public stopCamera = () => {
        if (this.state !== NETWORK_STATE.CONNECTED) throw new Error("Not Connected");
        let client = this.clients.find(client => client.id === this.id)!;
        let camera = client.sources.find(source => source.type === SOURCE_TYPE.CAMERA);
        if (!camera) return;
        this.removeSource(camera);
    };

    public startMicrophone = async () => {
        // Sanity Checks
        if (this.state !== NETWORK_STATE.CONNECTED) throw new Error("Not Connected");
        let client = this.clients.find(client => client.id === this.id)!;
        if (client.sources.find(source => source.type === SOURCE_TYPE.MICROPHONE)) throw new Error("Microphone already started");

        let captureStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });

        // Add Source
        let source: Source = { type: SOURCE_TYPE.MICROPHONE, id: captureStream.id, stream: captureStream };
        this.addSource(source);
        return source;
    };

    public stopMicrophone = () => {
        if (this.state !== NETWORK_STATE.CONNECTED) throw new Error("Not Connected");
        let client = this.clients.find(client => client.id === this.id)!;
        let microphone = client.sources.find(source => source.type === SOURCE_TYPE.MICROPHONE);
        if (!microphone) return;
        this.removeSource(microphone);
    };

    public startScreenShare = async () => {
        // Sanity Checks
        if (this.state !== NETWORK_STATE.CONNECTED) throw new Error("Not Connected");
        let client = this.clients.find(client => client.id === this.id)!;
        if (client.sources.find(source => source.type === SOURCE_TYPE.SCREEN_SHARE)) throw new Error("Screen share already started");

        let captureStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

        // Add Source
        let source: Source = { type: SOURCE_TYPE.SCREEN_SHARE, id: captureStream.id, stream: captureStream };
        this.addSource(source);
        return source;
    };

    public stopScreenShare = () => {
        if (this.state !== NETWORK_STATE.CONNECTED) throw new Error("Not Connected");
        let client = this.clients.find(client => client.id === this.id)!;
        let screen = client.sources.find(source => source.type === SOURCE_TYPE.SCREEN_SHARE);
        if (!screen) return;
        this.removeSource(screen);
    };

    public isStarted = () => {
        return this.state !== NETWORK_STATE.DISCONNECTED;
    };
    //#endregion

    //#region Public Callbacks
    public onNetworkStateChange = (state: NETWORK_STATE) => { };
    public onClientsChanged = (clients: Client[]) => { };
    public onIdChange = (id: string) => { };
    //#endregion

    //#region Private Methods
    private coordinatorSend<K extends COORDINATOR_MESSAGE_TYPE>(type: K, event: CoordinatorMessageOptions[K], id: string = "") {
        if (this.coordinatorConnection && this.coordinatorConnection.readyState === this.coordinatorConnection.OPEN) {
            this.coordinatorConnection.send(JSON.stringify({ id: id, type: type, data: event }));
        }
    }

    private sendMessage<K extends MESSAGE_TYPE>(type: K, data: MessageOptions[K]) {
        if (this.serverChannel?.readyState === "open")
            this.serverChannel?.send(JSON.stringify({ type: type, data: data }));
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

    private addSource(source: Source) {
        let client = this.clients.find(client => client.id === this.id)!;
        client.sources.push(source);

        this.sendMessage(MESSAGE_TYPE.ADD_SOURCE, {
            client: this.id,
            source: {
                id: source.id,
                type: source.type
            }
        });

        if (source.stream) {
            let remaining = 0;
            for (const track of source.stream.getTracks()) {
                remaining++;
                this.serverConn?.addTrack(track, source.stream);
                track.onended = () => {
                    remaining--;
                    if (remaining === 0) {
                        this.removeSource(source);
                    }
                };
            }
        }

        this.onClientsChanged(this.clients);
    }

    private removeSource(source: Source) {
        let client = this.clients.find(client => client.id === this.id);
        if (!client) return;

        let ind = client.sources.findIndex(item => item.id === source.id);
        if (ind === -1) return;

        source = client.sources[ind];

        if (source.stream) {
            for (const track of source.stream.getTracks()) {
                if (track.readyState == 'live')
                    track.stop();
            }
        }

        this.sendMessage(MESSAGE_TYPE.REMOVE_SOURCE, {
            client: this.id,
            source: source.id
        });

        client.sources.splice(ind, 1);

        this.onClientsChanged(this.clients);
    }

    private assignStreams = () => {
        if (this.unassignedStreams.length === 0) return;

        let changed = false;
        for (const serverClient of this.clients) {
            if (serverClient.state !== NETWORK_STATE.CONNECTED) continue;
            for (const source of serverClient.sources) {
                for (let i = this.unassignedStreams.length - 1; i > -1; i--) {
                    if (this.unassignedStreams[i].id === source.id) {
                        source.stream = this.unassignedStreams[i];
                        this.unassignedStreams.splice(i, 1);
                        changed = true;
                    }
                }
            }
        }

        if (changed) {
            this.onClientsChanged(this.clients);
        }
    };
    //#endregion

    //#region Private Callbacks
    private onServer = (resolve: () => void) => {
        if (!this.serverChannel) return;

        let makingOffer = false;
        let ignoreOffer = false;

        this.serverChannel.addEventListener("open", (event) => {
            if (!this.serverConn || !this.serverChannel) return;

            this.serverConn.onicecandidate = ({ candidate }) => {
                if (candidate) {
                    this.sendMessage(MESSAGE_TYPE.ICE, { candidate: candidate });
                }
            };

            this.serverConn.onnegotiationneeded = async () => {
                if (!this.serverConn || !this.serverChannel) return;

                try {
                    makingOffer = true;
                    await this.serverConn.setLocalDescription(await this.serverConn.createOffer());
                    if (this.serverConn.localDescription) {
                        this.sendMessage(MESSAGE_TYPE.SDP, { description: this.serverConn.localDescription });
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    makingOffer = false;
                }
            };

            this.sendMessage(MESSAGE_TYPE.JOIN, { id: this.id, name: this.name });
        });

        this.serverChannel.onmessage = async (event) => {
            if (!this.serverConn || !this.serverChannel) return;

            let data = JSON.parse(event.data);

            if (data.type === MESSAGE_TYPE.ADD_SOURCE) {
                const message = data as Message<MESSAGE_TYPE.ADD_SOURCE>;

                let client = this.clients.find(client => client.id === message.data.client);
                if (!client) return;

                // Sanity Check
                let oldSource = client.sources.findIndex(item => item.id === message.data.source.id);
                if (oldSource !== -1) return;

                client.sources.push({
                    id: message.data.source.id,
                    type: message.data.source.type,
                    stream: null
                });

                this.assignStreams();
            } else if (data.type === MESSAGE_TYPE.REMOVE_SOURCE) {
                const message = data as Message<MESSAGE_TYPE.REMOVE_SOURCE>;

                let client = this.clients.find(client => client.id === message.data.client);
                if (!client) return;

                let oldSource = client.sources.findIndex(item => item.id === message.data.source);

                // Sanity Check
                if (oldSource === -1) return;

                client.sources.splice(oldSource, 1);
                this.onClientsChanged(this.clients);
            } else if (data.type === MESSAGE_TYPE.SDP) {
                const message = data as Message<MESSAGE_TYPE.SDP>;

                try {
                    const description = message.data.description;
                    const offerCollision = (description.type === "offer") &&
                        (makingOffer || this.serverConn.signalingState !== "stable");

                    ignoreOffer = offerCollision;
                    if (ignoreOffer) {
                        return;
                    }

                    await this.serverConn.setRemoteDescription(description);

                    if (description.type === "offer") {
                        await this.serverConn.setLocalDescription(await this.serverConn.createAnswer());

                        if (this.serverConn.localDescription) {
                            this.sendMessage(MESSAGE_TYPE.SDP, { description: this.serverConn.localDescription });
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

                let ind = this.clients.findIndex(client => client.id === message.data.id);
                if (ind !== -1) return;

                this.clients.push({ id: message.data.id, name: message.data.name, sources: [], state: NETWORK_STATE.CONNECTED });
                if (message.data.id === this.id) {
                    this.setState(NETWORK_STATE.CONNECTED);
                    resolve();
                }
                this.onClientsChanged(this.clients);
            } else if (data.type === MESSAGE_TYPE.LEAVE) {
                const message = data as Message<MESSAGE_TYPE.LEAVE>;

                if (!message.data.id) {
                    this.disconnect();
                    return;
                }

                let ind = this.clients.findIndex(client => client.id === message.data.id);
                if (ind === -1) return;

                this.clients.splice(ind, 1);
                this.onClientsChanged(this.clients);

            }
        };
    };

    private onCoordinatorMessage = async (event: MessageEvent) => {
        const data = JSON.parse(event.data);

        if (data.type === COORDINATOR_MESSAGE_TYPE.ICE) {
            const message = data as CoordinatorMessage<COORDINATOR_MESSAGE_TYPE.ICE>;
            await this.serverConn?.addIceCandidate(message.data.candidate);
        } else if (data.type === COORDINATOR_MESSAGE_TYPE.CONNECT) {
            const message = data as CoordinatorMessage<COORDINATOR_MESSAGE_TYPE.CONNECT>;
            if (!this.serverConn) return;

            this.id = message.data.id;
            this.onIdChange(this.id);
            this.setState(NETWORK_STATE.CONNECTING);

            // Flush candidates
            for (let i = 0; i < this.candidates.length; i++) {
                this.coordinatorSend(COORDINATOR_MESSAGE_TYPE.ICE, { candidate: this.candidates[i] });
            }

            this.candidates.splice(0, this.candidates.length);

            await this.serverConn.setRemoteDescription(message.data.description);
        }
    };
    //#endregion
}