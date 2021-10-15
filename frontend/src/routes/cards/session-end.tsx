import { FunctionComponent } from "react";
import { SiteNav } from "../../components/sitenav";

interface Props {}
const SessionEnd: FunctionComponent<Props> = ({}) => {
  return (
    <div className="max-width">
      <SiteNav></SiteNav>
      <div className="dialog">
        <div className="recording-none">
            <img src="./assets/Sleepy.png" alt=""></img>
            <h4>This session has ended</h4>
            <p>Thank you for using Live Record.</p>
        </div>
        <button className="primary-btn">Home page</button>
    </div>
    </div>
  );
};

export default SessionEnd;
