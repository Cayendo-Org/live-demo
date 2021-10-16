import React, { createRef, FunctionComponent, useState } from "react";
import { Client } from "../../network/client";
import { Server } from "../../network/server";

interface Props { }
const Home: FunctionComponent<Props> = () => {
  const [client, setClient] = useState(new Client());
  const [server, setServer] = useState(new Server());
  const [sessionId, setSessionId] = useState("");
  const videoRef = createRef<HTMLVideoElement>();

  const temp = (event: RTCTrackEvent) => {
    console.log("Event:", event);

    let ref = document.getElementById("video") as HTMLVideoElement;
    ref.srcObject = event.streams[0];
    console.log("SRC:", ref.srcObject);
  };

  const startDemo = () => {
    server.onVideo = temp;

    console.log("Starting Server...");
    server.start().then((id) => {
      setSessionId(id);
      console.log(`Session Id: ${id}`);
    });
    console.log("Server Started");
  };

  const joinDemo = () => {
    client.connect(sessionId).then(() => { });
  };

  const pipHandler = () => {
    // @ts-ignore
    videoRef.current.requestPictureInPicture().then(pictureInPictureWindow => {
    });
  };

  return (
    <div>
      <button onClick={startDemo}>Start Demo</button>
      <input value={sessionId} onChange={(event) => setSessionId(event.target.value)} />
      <button onClick={joinDemo}>Join Demo</button>
      <video ref={videoRef} id="video"></video>
      <button onClick={pipHandler}>Open in pop up view</button>
    </div>
  );
};

export default Home;
