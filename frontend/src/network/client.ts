import { SignallingConnection } from "./signallingConnection";
import { CONFIG, Message, MESSAGE_TYPE, SignallingMessage, SIGNALLING_MESSAGE_TYPE, User } from "./types";

export class Client extends SignallingConnection {
    users: User[] = [];
    serverChannel: RTCDataChannel | null = null;
    serverConn: RTCPeerConnection | null = null;
    candidates: RTCIceCandidate[] = [];
    userId: string = "";

    connect = async (sessionId: string) => {
        return new Promise<void>(async (resolve, reject) => {
            console.log("Connecting...");
            this.userId = "";
            await this.signalingConnect();

            this.serverConn = new RTCPeerConnection(CONFIG);
            this.serverChannel = this.serverConn.createDataChannel("general", { negotiated: true, id: 0 });

            let makingOffer = false;
            let ignoreOffer = false;

            this.serverChannel.addEventListener("open", (event) => {
                console.log("OPENED");
                resolve();
                if (!this.serverConn || !this.serverChannel) return;
                console.log(`Client: Con: ${this.serverConn.connectionState}, ICE: ${this.serverConn.iceConnectionState}`);

                this.serverConn.onicecandidate = ({ candidate }) => {
                    if (candidate) {
                        this.serverChannel?.send(JSON.stringify({ type: MESSAGE_TYPE.ICE, data: candidate }));
                    }
                };

                this.serverConn.onnegotiationneeded = async () => {
                    if (!this.serverConn || !this.serverChannel) return;
                    console.log("New SDP Needed");
                    try {
                        makingOffer = true;
                        await this.serverConn.setLocalDescription();
                        this.serverChannel.send(JSON.stringify({ type: MESSAGE_TYPE.SDP, data: this.serverConn.localDescription }));
                    } catch (err) {
                        console.error(err);
                    } finally {
                        makingOffer = false;
                    }
                };

                console.log("Connected");


                // Testing
                // let vid = document.createElement("video") as HTMLVideoElement;
                // vid.src = "./To delete if leah doesnt want 2.mp4";
                // let mediaStream = (vid as any).captureStream();
                // vid.play();
                // for (const track of mediaStream.getTracks()) {
                //     this.serverConn?.addTrack(track, mediaStream);
                // }

                // navigator.mediaDevices.getDisplayMedia().then((captureStream) => {
                //     for (const track of captureStream.getTracks()) {
                //         this.serverConn?.addTrack(track, captureStream);
                //     }
                // });
                // navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then((captureStream) => {
                //     for (const track of captureStream.getTracks()) {
                //         this.serverConn?.addTrack(track, captureStream);
                //     }
                // });
            });

            this.serverChannel.onmessage = async (event) => {
                if (!this.serverConn || !this.serverChannel) return;

                let message = JSON.parse(event.data) as Message;

                if (message.type === MESSAGE_TYPE.SDP) {
                    try {
                        const description = message.data;
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
                            this.serverChannel.send(JSON.stringify({ type: MESSAGE_TYPE.SDP, data: this.serverConn.localDescription }));
                        }
                    } catch (err) {
                        console.error(err);
                    }
                } else if (message.type === MESSAGE_TYPE.ICE) {
                    try {
                        await this.serverConn.addIceCandidate(message.data);
                    } catch (err) {
                        if (!ignoreOffer) {
                            throw err;
                        }
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

                if (this.userId) { return; }

                // Flush candidates
                for (let i = 0; i < this.candidates.length; i++) {
                    this.signalingSend(SIGNALLING_MESSAGE_TYPE.ICE, { candidate: this.candidates[i] });
                }

                this.candidates.splice(0, this.candidates.length);
            };

            await this.serverConn.setLocalDescription();
            this.signalingSend(SIGNALLING_MESSAGE_TYPE.CONNECT, { description: this.serverConn.localDescription!, id: sessionId });
        });
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

            this.userId = message.data.id;

            // Flush candidates
            for (let i = 0; i < this.candidates.length; i++) {
                this.signalingSend(SIGNALLING_MESSAGE_TYPE.ICE, { candidate: this.candidates[i] });
            }

            this.candidates.splice(0, this.candidates.length);

            await this.serverConn.setRemoteDescription(message.data.description);
        }
    };
}