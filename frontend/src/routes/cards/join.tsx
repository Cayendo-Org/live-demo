import { FunctionComponent, useState } from "react";
import { useHistory } from "react-router";
import { SiteNav } from "../../components/sitenav";
import './join.css';

interface Props { }
const Join: FunctionComponent<Props> = () => {
  const [sessionId, setSessionId] = useState("");
  const history = useHistory();

  const onJoinClick = () => {
    history.push(`/session/${sessionId}`);
  };

  return (
    <div className="max-width">
      <SiteNav></SiteNav>
      <div className="dialog">
        <div className="form">
          <h3>Join session</h3>
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
            value={sessionId}
            onChange={event => setSessionId(event.target.value)}
          ></input>
        </div>
        <button className="primary-btn" onClick={onJoinClick}>Join session</button>
      </div>
    </div>
  );
};

export default Join;
