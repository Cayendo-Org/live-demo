import { FunctionComponent } from "react";
import { Link } from "react-router-dom";
import { SiteNav } from "../../components/sitenav";
import Sleepy from "../../assets/Sleepy.png";
import "../recordings/recordings.css";

interface Props {}
const SessionEnd: FunctionComponent<Props> = ({}) => {
  return (
    <div className="max-width">
      <SiteNav></SiteNav>
      <div className="dialog">
        <div className="recording-none">
          <img draggable="false" src={Sleepy} alt=""></img>
          <h4>This session has ended</h4>
          <p>Thank you for using Live Record.</p>
        </div>
        <Link to="/">
          <button className="primary-btn">Home page</button>
        </Link>
      </div>
    </div>
  );
};

export default SessionEnd;
