import { createRef, FunctionComponent, useState } from "react";
import { Client } from "../../network/client";
import { Server } from "../../network/server";

interface Props { }
const Session: FunctionComponent<Props> = () => {
  const [client, setClient] = useState(new Client());
  const [server, setServer] = useState(new Server());
  const [sessionId, setSessionId] = useState("");
  const videoRef = createRef<HTMLVideoElement>();

  const startServer = () => {
    server.onVideo = (event: RTCTrackEvent) => {
      console.log("Event:", event);
      let ref = document.getElementById("video") as HTMLVideoElement;
      ref.srcObject = event.streams[0];
      console.log("SRC:", ref.srcObject);
    };

    console.log("Starting Server...");
    server.start().then((id) => {
      setSessionId(id);
      console.log("Server Started");
      console.log(`Session Id: ${id}`);
    });
  };

  const joinServer = () => {
    client.connect(sessionId).then(() => { });
  };
  return <div>
    <button onClick={startServer}>Start Server</button>
    <input value={sessionId} onChange={(event) => setSessionId(event.target.value)} />
    <button onClick={joinServer}>Join</button>
    <video ref={videoRef} id="video"></video>
  </div>;
};

export default Session;
