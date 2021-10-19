import { FunctionComponent, useEffect, useState } from "react";
import { useHistory, useParams } from "react-router";
import { NetworkServer } from "../../../../shared/server";
import Room from "./room/room";
import Settings from "./settings/settings";

interface Props { }
const Component: FunctionComponent<Props> = () => {
    const params = useParams<{ id: string; }>();
    const history = useHistory<{ isServer?: boolean; }>();

    // const [isServer] = useState(!params.id);
    const [server] = useState(() => { console.log("CREATED NetworkServer"); return new NetworkServer(); });
    const [username, setUsername] = useState("");
    const [started, setStarted] = useState(false);

    const start = () => {
        if (!username) return;
        if (params.id && (!history.location.state || !history.location.state.isServer)) return setStarted(true);
        if (server.isStarted()) return;

        console.log("Starting Server...");
        server.start().then((id) => {
            console.log("Server Started");
            console.log(`Session Id: ${id}`);
            setStarted(true);
            history.replace(`/session/${id}`);
        });
    };

    useEffect(() => {
        if (!params.id && (!history.location.state || !history.location.state.isServer)) {
            history.replace({ state: { isServer: true } });
        }
    }, [history, params]);

    return (started && params.id && username) ? <Room sessionId={params.id} username={username} /> :
        <Settings
            username={username}
            setUsername={setUsername}
            start={start}
            isServer={history.location.state ? !!history.location.state.isServer : false}
        />;
};

export default Component;