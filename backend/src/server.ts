const port = process.env.PORT || 1337;
const express = require("express");
const app = express();
const expressWs = require("express-ws")(app);

let sessions = {};

function createUuid() {
  return 'test_session'
  // @ts-ignore
  return String(Math.floor(Math.random() * 999999)).padStart(6, "0");
}

app.use("/", express.static("../../frontend/build"));

app.listen(port, () => {
  console.log("server started at http://localhost:" + port);
});

app.ws("/", function (ws, req) {
  ws.on("message", (message) => {
    // @ts-ignore
    let msg = JSON.parse(message);
    console.log("onmessage", msg);
    if (msg.startHost) {
      let uuid = createUuid();
      while (sessions[uuid]) {
        uuid = createUuid();
      }
      sessions[uuid] = { host: ws };
      ws.send(JSON.stringify({ sessionCreated: true, sessionId: uuid }));
      return;
    }

    let session = sessions[msg.sessionId];
    if (!session || msg.uuid === "host") return ws.close();

    if (session.host.readyState !== WebSocket.OPEN) {
      ws.clients.forEach((client) => {
        client.close();
      });
      delete sessions[msg.sessionId];
      ws.close();
      return;
    }

    if (ws === session.host) {
      if (session[msg.uuid]) session[msg.uuid].send(message);
    } else {
      session[msg.uuid] = ws;
      session.host.send(message);
    }
  });

  ws.on("close", (code, reason) => {
    console.log("onclose", code, reason);
    for (const key of Object.keys(sessions)) {
      if (sessions[key].host === ws) {
        delete sessions[key];
        break;
      } else {
        for (const uuid of Object.keys(sessions[key])) {
          if (sessions[key][uuid] === ws) {
            delete sessions[key][uuid];
          }
        }
      }
    }
  });
});