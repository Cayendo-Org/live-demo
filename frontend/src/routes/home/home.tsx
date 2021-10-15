import React from "react";
import { FunctionComponent, useState } from "react";
import { SiteNav } from "../../components/sitenav";
import { NetworkManager } from "../../network/network_manager";
import "./hero.css";
import "./features.css";
import LiveDemo from "../../assets/LiveDemo.png";
import Selfie from "../../assets/Selfie.png";
import StarEyes from "../../assets/StarEyes.png";
import FaceWithMask from "../../assets/FaceWithMask.png";
import chrome from "../../assets/chrome.svg";
import edge from "../../assets/edge.svg";
import { Link } from "react-router-dom";

// Media contrains
const constraints = {
  video: true,
  // Uncomment to enable audio
  // audio: true,
};

interface Props {}
const Home: FunctionComponent<Props> = ({}) => {
  let videoRef = React.createRef<HTMLVideoElement>();

  const startDemo = () => {
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
    videoRef.current
      .requestPictureInPicture()
      .then((pictureInPictureWindow) => {});
  };

  return (
    <div className="max-width">
      <SiteNav></SiteNav>
      <div className="feature-wrapper">
        <div id="hero-banner">
          <div className="hero-text">
            <div>
              <h1>Record faster,</h1>
              <h1 id="together">together</h1>
            </div>
            <h5 className="">
              Live Record connects everyone in the presentation process so teams
              can deliver better recordings, faster.
            </h5>
            <Link to="/start">
              <button>Start recording now</button>
            </Link>
          </div>

          <img className="hero-img" src={LiveDemo} alt=""></img>
        </div>

        <h3 className="title">Features</h3>
        <div className="row-cards">
          <div className="card purple">
            <img src={Selfie} alt=""></img>
            <h2>Record</h2>
            <p>
              Record the video, audio and screen of everyone in the room.
              Recordings are saved to the host's device.
            </p>
          </div>
          <div className="card blue">
            <img src={StarEyes} alt=""></img>
            <h2>Collaborate</h2>
            <p>
              Collaborate with up to four members of your team in real time with
              screen drawing and shape creation.
            </p>
          </div>
          <div className="card yellow">
            <img src={FaceWithMask} alt=""></img>
            <h2>No accounts</h2>
            <p>
              You can create and join a room quickly. No account required and
              the site works well on any device.
            </p>
          </div>
        </div>
        <div className="long-card">
          <div>
            <h2>Works best on Chromium browsers</h2>
            <p>
              Ensuring your experience is the best it can be we recommend using
              a Chromium browser like Google Chrome or Microsoft Edge.
            </p>
          </div>
          <div>
            <img src={chrome} alt=""></img>
            <img src={edge} alt=""></img>
          </div>
        </div>

        <div className="footer">
          <div>
            <h3>Hello from Toronto,</h3>
            <h3>Canada</h3>
          </div>
          <div className="credits">
            <p>Created by Julian de Rushe, Brian Latchman, Tomasz Cieslak.</p>
            <p>All rights reserved, 2021.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
