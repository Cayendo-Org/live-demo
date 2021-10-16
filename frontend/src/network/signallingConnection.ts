import { SignallingMessageOptions, SIGNALLING_MESSAGE_TYPE } from "./types";

export class SignallingConnection {
  signalingConnection: WebSocket | null = null;

  signalingSend<K extends SIGNALLING_MESSAGE_TYPE>(type: K, event: SignallingMessageOptions[K], id: string = "") {
    if (this.signalingConnection && this.signalingConnection.readyState === this.signalingConnection.OPEN) {
      this.signalingConnection.send(JSON.stringify({ id: id, type: type, data: event }));
    }
  }

  signalingConnect() {
    return new Promise<void>((resolve, reject) => {
      if (this.signalingConnection && this.signalingConnection.OPEN) {
        this.signalingConnection.close();
      }

      this.signalingConnection = new WebSocket(process.env.REACT_APP_WS_URL!);

      this.signalingConnection.onmessage = this.onSignalingMessage;

      this.signalingConnection.onclose = () => {
        console.log("Signalling Closed");
        reject();
      };

      this.signalingConnection.onerror = (error) => {
        console.error("onerror", error);
        reject(error);
      };

      this.signalingConnection.onopen = () => {
        console.log("Signalling Opened");
        resolve();
      };
    });
  }

  onSignalingMessage = async (event: MessageEvent) => { };
}
