import { FunctionComponent } from "react";
import { SiteNav } from "../../components/sitenav";
import './start.css';

interface Props {}
const Start: FunctionComponent<Props> = ({}) => {
  return (
    <div className="max-width">
      <SiteNav></SiteNav>
      <div className="dialog">
        <div>
          <h3>Create a session</h3>
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
            // onkeypress="return /[a-z]/i.test(event.key)"
          ></input>
        </div>
        <button className="primary-btn">Start session</button>
      </div>
    </div>
  );
};

export default Start;
