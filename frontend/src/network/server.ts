import { SignallingConnection } from "./signallingConnection";
import { CONFIG, Message, MESSAGE_TYPE, ServerUser, SignallingMessage, SIGNALLING_MESSAGE_TYPE } from "./types";

export class Server extends SignallingConnection {
    users: ServerUser[] = [];
    sessionCreateResolve: ((code: string) => void) | null = null;

    async start() {
        return new Promise<string>(async (resolve, reject) => {
            this.sessionCreateResolve = resolve;
            await this.signalingConnect();
            this.signalingSend(SIGNALLING_MESSAGE_TYPE.SESSION_CREATE, { id: "" });
        });
    }

    onVideo = (event: RTCTrackEvent) => {
    };

    onSignalingMessage = async (event: MessageEvent) => {
        const data = JSON.parse(event.data);

        if (data.type === SIGNALLING_MESSAGE_TYPE.CONNECT) {
            const message = data as SignallingMessage<SIGNALLING_MESSAGE_TYPE.CONNECT>;
            let pc = new RTCPeerConnection(CONFIG);

            let dataChannel = pc.createDataChannel("general", { negotiated: true, id: 0, });
            let candidates: RTCIceCandidate[] = [];
            let id = "";

            dataChannel.addEventListener("open", (event) => {
                console.log(`Server: Con: ${pc.connectionState}, ICE: ${pc.iceConnectionState}, SIGNAL: ${pc.signalingState}}`);

                pc.onicecandidate = ({ candidate }) => {
                    if (candidate) {
                        dataChannel.send(JSON.stringify({ type: MESSAGE_TYPE.ICE, data: candidate }));
                    }
                };

                pc.onnegotiationneeded = async () => {
                    try {
                        await pc.setLocalDescription();
                        dataChannel.send(JSON.stringify({ type: MESSAGE_TYPE.SDP, data: pc.localDescription }));
                    } catch (err) {
                        console.error(err);
                    }
                };
            });

            dataChannel.onmessage = async (event) => {
                let message = JSON.parse(event.data) as Message;

                if (message.type === MESSAGE_TYPE.SDP) {
                    try {
                        const description = message.data;

                        console.log(`New remote SDP, Type: ${description.type}`);

                        await pc.setRemoteDescription(description);
                        if (description.type === "offer") {
                            await pc.setLocalDescription();
                            dataChannel.send(JSON.stringify({ type: MESSAGE_TYPE.SDP, data: pc.localDescription }));
                        }
                    } catch (err) {
                        console.error(err);
                    }
                } else if (message.type === MESSAGE_TYPE.ICE) {
                    try {
                        await pc.addIceCandidate(message.data);
                    } catch (err) {
                        throw err;
                    }
                }
            };

            pc.ontrack = (event) => {
                this.onVideo(event);
            };

            pc.oniceconnectionstatechange = () => {
                if (pc.iceConnectionState === "failed") {
                    pc.restartIce();
                }
            };

            pc.onicecandidate = ({ candidate }) => {
                if (!candidate) { return; }
                candidates.push(candidate);

                if (!id) { return; }

                // Flush candidates
                for (let i = 0; i < candidates.length; i++) {
                    this.signalingSend(SIGNALLING_MESSAGE_TYPE.ICE, { candidate: candidates[i] }, user.id);
                }
                candidates.splice(0, candidates.length);
            };

            // Create new user
            id = String(Math.floor(Math.random() * 999999)).padStart(6, "0");
            let user = { name: "", sources: [], pc: pc, id: id, dataChannel: dataChannel };
            this.users.push(user);

            // Create answer
            await pc.setRemoteDescription(message.data.description);
            await pc.setLocalDescription();
            if (!pc.localDescription) return;

            this.signalingSend(SIGNALLING_MESSAGE_TYPE.CONNECT, { description: pc.localDescription, id: user.id }, message.id);

            // Flush candidates
            for (let i = 0; i < candidates.length; i++) {
                this.signalingSend(SIGNALLING_MESSAGE_TYPE.ICE, { candidate: candidates[i] }, user.id);
            }
            candidates.splice(0, candidates.length);
        } else if (data.type === SIGNALLING_MESSAGE_TYPE.ICE) {
            const message = data as SignallingMessage<SIGNALLING_MESSAGE_TYPE.ICE>;

            for (let i = 0; i < this.users.length; i++) {
                if (this.users[i].id === message.id) {
                    console.log("ADDED");
                    await this.users[i].pc.addIceCandidate(message.data.candidate);
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