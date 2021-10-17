import { createRef, FunctionComponent, useState } from "react";
import { SiteNav } from "../../components/sitenav";
import { NetworkClient } from "../../network/client";
import { NetworkServer } from "../../network/server";

interface Props { }
const Session: FunctionComponent<Props> = () => {
  const [client, setClient] = useState(new NetworkClient());
  const [server, setServer] = useState(new NetworkServer());
  const [sessionId, setSessionId] = useState("");
  const videoRef = createRef<HTMLVideoElement>();

  const startServer = () => {
    console.log("Starting Server...");
    server.start().then((id) => {
      setSessionId(id);
      console.log("Server Started");
      console.log(`Session Id: ${id}`);
    });
  };

  const joinServer = () => {
    client.onVideo = (event: RTCTrackEvent) => {
      console.log("Stream:", event.streams[0].id);
      console.log("Event:", event);
      let ref = document.getElementById("video") as HTMLVideoElement;
      ref.srcObject = event.streams[0];
      ref.play();
      console.log("SRC:", ref.srcObject);
    };
    client.connect(sessionId).then(() => { });
  };

  const startCamera = () => {
    client.startCamera();
  };

  const startScreenShare = () => {
    client.startScreenShare();
  };

  return (
    <div className="max-width">
      <SiteNav></SiteNav>
      <button onClick={startServer}>Start Server</button>
      <input
        value={sessionId}
        onChange={(event) => setSessionId(event.target.value)}
      />
      <button onClick={joinServer}>Join</button>
      <button onClick={startCamera}>Start Camera</button>
      <button onClick={startScreenShare}>Start Screen Share</button>
      <video ref={videoRef} id="video"></video>
    </div>
  );
};

export default Session;
