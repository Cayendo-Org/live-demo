import { RTCPeerConnection } from "wrtc";
import WebSocket from 'ws';
import { NetworkServer } from "../../shared/server";

//#region Polyfills
global.WebSocket = WebSocket as any;
global.RTCPeerConnection = RTCPeerConnection;
//#endregion

process.env.REACT_APP_WS_URL = "wss://record-together.azurewebsites.net";

let server = new NetworkServer();

console.log("Starting...");
server.start(process.argv.length > 2 ? process.argv[2] : "").then((code) => {
    console.log(`Session code: ${code}`);
}).catch(() => {
    console.log("Failed to start server");
});