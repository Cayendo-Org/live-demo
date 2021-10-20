import { ChangeEventHandler, FunctionComponent, useState } from "react";
import { useHistory } from "react-router";
import { SiteNav } from "../../components/navbar/navbar";

interface Props { }
const Join: FunctionComponent<Props> = () => {
  const [sessionId, setSessionId] = useState("");
  const history = useHistory();

  const onSubmit: ChangeEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (sessionId.length !== 5) { return; }
    history.push(`/session/${sessionId}`);
  };

  const onSessionIdChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    setSessionId(event.target.value.replaceAll(/\D/g, "").slice(0, 5));
  };

  return (
    <div className="max-width">
      <SiteNav></SiteNav>
      <form className="card" onSubmit={onSubmit}>
        <h3>Join session</h3>
        <label>
          <p title="Enter session code" className="input-label">Enter session code</p>
          <input
            placeholder="Five digit session code"
            className="input"
            value={sessionId}
            onChange={onSessionIdChange}
            autoFocus
          />
        </label>
        <div className="center">
          <button className="primary-btn" type="submit">Continue</button>
        </div>
      </form>
    </div>
  );
};

export default Join;