import React from "react";
import { FunctionComponent, useState } from "react";
import { useHistory } from "react-router";
import { NetworkManager } from "../../network/network_manager";

// Media contrains
const constraints = {
  video: true,
  // Uncomment to enable audio
  // audio: true,
};

interface Props {}
const Home: FunctionComponent<Props> = ({}) => {
  const history = useHistory();
  let videoRef = React.createRef<HTMLVideoElement>();

  const startDemo = () => {
    // history.push("/start")
    NetworkManager.instance
      .startHost("host_name")
      .then((sessionId: string) => {
        console.log("Host: STARTED WITH SESSION ID", sessionId);
      })
      .catch((err) => {
        console.log("Host: FAILED TO START SESSION", err);
      });
  };

  const joinDemo = () => {
    let test_session = "test_session";
    // history.push("/join");
    NetworkManager.instance
      .startClient("client_name", test_session)
      .then((sessionId: string) => {
        console.log("Client: CONNECTED TO SESSION ID", sessionId);
        navigator.mediaDevices
          .getUserMedia(constraints)
          .then((stream) => {
            // @ts-ignore
            videoRef.current.srcObject = stream;
            // socket.emit("broadcaster");
          })
          .catch((error) => console.error(error));
      })
      .catch((err) => {
        console.log(
          "Client: FAILED TO CONNECTED TO SESSION ID",
          test_session,
          "WITH ERROR",
          err
        );
      });
  };

  const pipHandler = () => {
    // @ts-ignore
    videoRef.current.requestPictureInPicture().then(pictureInPictureWindow => {
    });
  };

  return (
    <div>
      <button onClick={startDemo}>Start Demo</button>
      <button onClick={joinDemo}>Join Demo</button>
      <video playsInline autoPlay ref={videoRef}></video>
      <button onClick={pipHandler}>Open in pop up view</button>
    </div>
  );
};

export default Home;
