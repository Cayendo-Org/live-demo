import { FunctionComponent, useState } from "react";
import { useHistory, useParams } from "react-router";
import { NetworkServer } from "../../network/server";
import Room from "./room/room";

interface Props { }
const Component: FunctionComponent<Props> = () => {
    const params = useParams<{ id: string; }>();
    const history = useHistory();

    const [isServer] = useState(!params.id);
    const [server] = useState(() => { console.log("CREATED"); return new NetworkServer(); });
    const [username, setUsername] = useState("");
    const [started, setStarted] = useState(false);

    const onStartClick = () => {
        if (!username) return;
        if (!isServer) return setStarted(true);
        if (server.isStarted()) return;

        console.log("Starting Server...");
        server.start().then((id) => {
            console.log("Server Started");
            console.log(`Session Id: ${id}`);
            setStarted(true);
            history.replace({ pathname: `/session/${id}` });
        });
    };

    return (started && params.id) ? <Room sessionId={params.id} /> : <div>
        <input value={username} onChange={event => setUsername(event.target.value)} />
        <button onClick={onStartClick}>Start</button>
    </div>;
};

export default Component;