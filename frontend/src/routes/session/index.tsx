import { FunctionComponent, useState } from "react";
import { useHistory, useParams } from "react-router";
import { NetworkServer } from "../../../../shared/server";
import Room from "./room/room";
import Settings from "./settings/settings";

interface Props { }
const Component: FunctionComponent<Props> = () => {
    const params = useParams<{ id: string; }>();
    const history = useHistory();

    const [isServer] = useState(!params.id);
    const [server] = useState(() => { console.log("CREATED NetworkServer"); return new NetworkServer(); });
    const [username, setUsername] = useState("");
    const [started, setStarted] = useState(false);

    const start = () => {
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

    return (started && params.id) ? <Room sessionId={params.id} /> :
        <Settings
            username={username}
            setUsername={setUsername}
            start={start}
            isServer={isServer}
        />;
};

export default Component;