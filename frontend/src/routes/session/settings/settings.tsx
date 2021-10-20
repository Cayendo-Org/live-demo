import { ChangeEventHandler, FunctionComponent } from "react";
import { SiteNav } from "../../../components/navbar/navbar";

interface Props {
  displayName: string;
  setDisplayName: (username: string) => void;
  start: () => void;
  isServer: boolean;
}
const Join: FunctionComponent<Props> = ({ displayName, setDisplayName, start, isServer }) => {
  const onSubmit: ChangeEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (displayName.length === 0) { return; }
    start();
  };

  const onUsernameChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    setDisplayName(event.target.value.slice(0, 200));
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
            value={displayName}
            onChange={onUsernameChange}
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