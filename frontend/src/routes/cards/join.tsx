import { FunctionComponent } from "react";
import { SiteNav } from "../../components/sitenav";

interface Props {}
const Join: FunctionComponent<Props> = ({}) => {
  return (
    <div className="max-width">
      <SiteNav></SiteNav>
      <div className="dialog">
        <div className="form">
          <h3>Join session</h3>
          <label
            htmlFor="display-name"
            className="input-label"
            title="Enter your email to log in"
          >
            Display name
          </label>
          <input
            id="display-name"
            placeholder="Display name (visible to other users)"
            className="input"
            // style="margin-bottom: 20px;"
            // onKeyPress="return /[a-z]/i.test(event.key)"
          ></input>
          <label
            htmlFor="session-code"
            className="input-label"
            title="Enter your email to log in"
          >
            Session code
          </label>
          <input
            id="session-code"
            placeholder="Six digit session code"
            className="input"
            pattern="\d*"
            maxLength={6}
          ></input>
        </div>
        <button className="primary-btn">Join session</button>
      </div>
    </div>
  );
};

export default Join;
