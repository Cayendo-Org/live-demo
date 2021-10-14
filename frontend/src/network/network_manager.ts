import { FunctionComponent } from "react";
const peerConnections = {};
const config = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302"]
    }
  ]
};

const enum MODE {
  NONE,
  HOST,
  CLIENT,
}

const enum USERCOLOR {
  RED,
  GREEN,
  BLUE,
  YELLOW,
}

const SERVER_IP = window.location.hostname;
const PORT = 1337;

export interface Point {
  x: number;
  y: number;
}

export interface User {
  audio: any;
  camera: any;
  isHost: any;
  userColor: USERCOLOR;
  cursor: Point;
  name: any;
  uuid: any;
}

export class NetworkManager {
  static _instance: NetworkManager;

  mode: MODE = MODE.NONE;
  name: string = "";
  users: User[] = [];
  sessionId: string = "";

  private signalingConnection: WebSocket | null = null;

  static get instance() {
    if (NetworkManager._instance == null)
      NetworkManager._instance = new NetworkManager();
    return this._instance;
  }

  public async startHost(name: string) {
    if (this.mode === MODE.HOST) { throw new Error("Already a host!"); }
    if (this.mode === MODE.CLIENT) { throw new Error("Already a client!"); }
    this.mode = MODE.HOST;
    this.name = name;
    return this._setupSignalingServer();
  }

  public async startClient(name: string, sessionCode: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (this.mode === MODE.HOST) { return reject(new Error("Already a host!")); }
      if (this.mode === MODE.CLIENT) { return reject(new Error("Already a client!")); }
      this.mode = MODE.CLIENT;
      this.name = name;
      this.sessionId = sessionCode;
      
      try {
        await this._setupSignalingServer();
      } catch (error) {
        console.error("Connection error:", error);
        return reject(new Error("Failed to create connection!"));
      }

      resolve(this.sessionId);

    });
  }

  private _setupSignalingServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      let signalCon = new WebSocket(`ws://${SERVER_IP}:${PORT}`);
      this.signalingConnection = signalCon;

      signalCon.onmessage = async (event) => {
        console.log("onmessage");
        const message = JSON.parse(event.data);
        try {
          if (this.mode === MODE.HOST) {
            console.log('message for host:', message);
            if (message.sessionCreated) {
              return resolve(message.sessionId);
            }
          } else {
            console.log('message for client:', message);
          }
        } catch (error) {
          console.error("Signalling error:", error);
        }
      };

      signalCon.onclose = () => {
        console.log("onclose");
      };

      signalCon.onerror = (error) => {
        console.error("onerror", error);
      };

      signalCon.onopen = (_) => {
        console.log("onopen");
        if (this.mode === MODE.CLIENT) {
          resolve(this.sessionId);
        } else {
          this.signalingConnection?.send(JSON.stringify({ startHost: true }));
        }
      };
    });
  }
}
