import React, { FunctionComponent } from "react";
import { useHistory } from "react-router-dom";
import chrome from "../../assets/images/chrome.svg";
import edge from "../../assets/images/edge.svg";
import FaceWithMask from "../../assets/images/FaceWithMask.png";
import LiveDemo from "../../assets/images/LiveDemo.png";
import Selfie from "../../assets/images/Selfie.png";
import StarEyes from "../../assets/images/StarEyes.png";
import { SiteNav } from "../../components/navbar/navbar";
import styles from "./home.module.css";

interface Props { }
const Home: FunctionComponent<Props> = () => {
  const history = useHistory();

  const onSessionClick = () => {
    history.push(`/session`);
  };

  return (<div className="max-width">
    <SiteNav></SiteNav>
    <div className={styles.featureWrapper}>
      <div className={styles.heroBanner}>
        <div className={styles.heroText}>
          <div>
            <h1>Record faster,</h1>
            <h1 className={styles.negMargin}>together</h1>
          </div>
          <h5 className="">Live Record connects everyone in the presentation process so teams can deliver better recordings, faster.</h5>
          <button className={styles.ctaBtn} onClick={onSessionClick}>Start recording now</button>
        </div>

        <img draggable="false" className={styles.heroImg} src={LiveDemo} alt="Live Demo banner" />
      </div>

      <h3 className={styles.title}>Features</h3>
      <div className={styles.rowCards}>
        <div className={`${styles.displayCard} ${styles.purple}`}>
          <img draggable="false" src={Selfie} alt="Selfie emoji" />
          <h2>Record</h2>
          <p>Record the video, audio and screen of everyone in the room. Recordings are saved to the host's device.</p>
        </div>
        <div className={`${styles.displayCard} ${styles.blue}`}>
          <img draggable="false" src={StarEyes} alt="Star eyes emoji" />
          <h2>Collaborate</h2>
          <p>Collaborate with up to four members of your team in real time with screen drawing and shape creation.
          </p>
        </div>
        <div className={`${styles.displayCard} ${styles.yellow}`}>
          <img draggable="false" src={FaceWithMask} alt="Face with mask emoji" />
          <h2>No accounts</h2>
          <p>You can create and join a room quickly. No account required and the site works well on any device.
          </p>
        </div>
      </div>
      <div className={styles.longCard}>
        <img draggable="false" src={edge} className={styles.mobileEdge} alt="Microsoft Edge logo" />
        <div>
          <h2>Works best on Chromium browsers</h2>
          <p>Ensuring your experience is the best it can be we recommend using a Chromium browser like Google
            Chrome or Microsoft Edge.</p>
        </div>
        <div className={styles.browsers}>
          <img draggable="false" src={chrome} alt="Google Chrome logo" />
          <img draggable="false" src={edge} alt="Microsoft Edge logo" />
        </div>
      </div>

      <div className={styles.footer}>
        <div>
          <h3>Hello from Toronto,</h3>
          <h3>Canada</h3>
        </div>
        <div className={styles.credits}>
          <p>Created by Julian de Rushe, Brian Latchman, Tomasz Cieslak.</p>
          <p>All rights reserved, 2021.</p>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Home;
