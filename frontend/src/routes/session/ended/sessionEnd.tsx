import { FunctionComponent } from "react";
import { useHistory } from "react-router-dom";
import Sleepy from "../../../assets/images/Sleepy.png";
import { SiteNav } from "../../../components/navbar/navbar";
import styles from "./sessionEnd.module.css";

interface Props { }
const SessionEnd: FunctionComponent<Props> = () => {
  const history = useHistory();

  const onHomeClick = () => {
    history.push("/");
  };

  return (
    <div className="max-width">
      <SiteNav />
      <div className="card center">
        <div className={`center ${styles.gap}`}>
          <img draggable="false" src={Sleepy} alt="" />
          <h4>This session has ended</h4>
          <p>Thank you for using Live Record.</p>
        </div>
        <button className="primary-btn" onClick={onHomeClick}>Home page</button>
      </div>
    </div>
  );
};

export default SessionEnd;
