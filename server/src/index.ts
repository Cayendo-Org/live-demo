import commandLineArgs from "command-line-args";
import { RTCPeerConnection } from "wrtc";
import WebSocket from 'ws';
import { NetworkServer } from "../../shared/server";

//#region Polyfills
global.WebSocket = WebSocket as any;
global.RTCPeerConnection = RTCPeerConnection;
//#endregion

let options = commandLineArgs([
    { name: 'coordinator', alias: 'c', type: String, defaultValue: "wss://record-together.azurewebsites.net" },
    { name: 'sessionid', alias: 's', type: String, defaultValue: "", defaultOption: true },
]);
process.env.REACT_APP_COORDINATOR_URL = options.coordinator;

let server = new NetworkServer();

console.log("Starting...");
server.start(options.sessionid).then((code) => {
    console.log(`Session code: ${code}`);
}).catch(() => {
    console.log("Failed to start server");
});