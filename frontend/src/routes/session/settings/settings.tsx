import { ChangeEventHandler, FunctionComponent } from "react";
import { SiteNav } from "../../../components/navbar/navbar";

interface Props {
  username: string;
  setUsername: (username: string) => void;
  start: () => void;
  isServer: boolean;
}
const Join: FunctionComponent<Props> = ({ username, setUsername, start, isServer }) => {
  const onSubmit: ChangeEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (username.length === 0) { return; }
    start();
  };

  const onSessionIdChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    setUsername(event.target.value.slice(0, 200));
  };

  return (
    <div className="max-width">
      <SiteNav />
      <form className="card" onSubmit={onSubmit}>
        <h3>{isServer ? "Start session" : "Join session"}</h3>
        <label>
          <p title="Display name" className="input-label">Display name</p>
          <input
            placeholder="Display name (visible to other users)"
            className="input"
            value={username}
            onChange={onSessionIdChange}
            autoFocus
          />
        </label>
        <div className="center">
          <button className="primary-btn" type="submit">{isServer ? "Start session" : "Join session"}</button>
        </div>
      </form>
    </div>
  );
};

export default Join;