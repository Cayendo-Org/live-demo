import express from "express";
import expressWs from "express-ws";
import path from "path";
import WebSocket from 'ws';
import { SignallingMessage, SIGNALLING_MESSAGE_TYPE } from "./types";

const port = process.env.PORT || 25566;
const { app } = expressWs(express());

export interface Session {
  server: WebSocket;
  clientMap: Record<string, WebSocket>;
  connectingClientMap: Record<string, WebSocket>;
}

let sessions: Record<string, Session> = {};

const createUuid = () => {
  return String(Math.floor(Math.random() * 999999)).padStart(6, "0");
};

app.ws("/", function (ws, req) {
  ws.on("message", (rawData) => {
    let data = JSON.parse(rawData.toString());

    // Create room
    if (data.type === SIGNALLING_MESSAGE_TYPE.SESSION_CREATE) {
      let uuid = createUuid();

      while (sessions[uuid]) {
        uuid = createUuid();
      }

      // Setup server metadata
      (ws as any).sessionId = uuid;
      (ws as any).id = "";
      sessions[uuid] = { server: ws, clientMap: {}, connectingClientMap: {} };

      let mess: SignallingMessage<SIGNALLING_MESSAGE_TYPE.SESSION_CREATE> = {
        id: "",
        type: SIGNALLING_MESSAGE_TYPE.SESSION_CREATE,
        data: { id: uuid }
      };

      // Notify host of success
      return ws.send(JSON.stringify(mess));
    }

    // Setup server metadata
    if (data.type === SIGNALLING_MESSAGE_TYPE.CONNECT) {
      let session = sessions[(ws as any).sessionId ? (ws as any).sessionId : data.data.id];
      if (!session) {
        return ws.close();
      }

      // Setup new client
      if (session.server === ws) {
        // Move ws
        let socket = session.connectingClientMap[data.id];
        if (!socket) { return; }
        delete session.connectingClientMap[data.id];

        session.clientMap[data.data.id] = socket;
        (socket as any).id = data.data.id;
        (socket as any).conId = "";
        socket.send(JSON.stringify(data));
        return;
      }

      // Assign one time connection id
      (ws as any).sessionId = data.data.id;
      (ws as any).conId = String(Math.floor(Math.random() * 999999)).padStart(6, "0");
      session.connectingClientMap[(ws as any).conId] = ws;
      data.id = (ws as any).conId;
      session.server.send(JSON.stringify(data));
      return;
    }

    let session = sessions[(ws as any).sessionId];
    if (!session) {
      return ws.close();
    }

    if (session.server === ws) {
      let socket = session.clientMap[data.id];
      if (!socket) { return; }
      socket.send(JSON.stringify(data));
    } else if ((ws as any).id) {
      data.id = (ws as any).id;
      session.server.send(JSON.stringify(data));
    } else {
      return ws.close();
    }
  });

  ws.on("close", (code, reason) => {
    let session = sessions[(ws as any).sessionId];
    if (!session) { return; }

    // Server close
    if (ws === session.server) {
      for (const id of Object.keys(session.connectingClientMap)) {
        session.connectingClientMap[id].close();
      }

      for (const id of Object.keys(session.clientMap)) {
        session.clientMap[id].close();
      }

      delete sessions[(ws as any).sessionId];
      return;
    }

    // Client close
    if ((ws as any).conId) {
      session.connectingClientMap[(ws as any).conId].close();
      delete session.connectingClientMap[(ws as any).conId];
    } else {
      session.clientMap[(ws as any).id].close();
      delete session.clientMap[(ws as any).id];
    }
  });
});

app.use(express.static(path.join(__dirname, "./build")));
app.get("*", (req, res) => { res.sendFile(path.join(__dirname, "./build/index.html")); });

app.listen(port, () => {
  console.log("server started at http://localhost:" + port);
});
