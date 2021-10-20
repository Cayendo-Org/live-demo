import { FunctionComponent, useEffect, useState } from "react";
import { useHistory, useParams } from "react-router";
import { NetworkServer } from "../../../../shared/server";
import { useSavedState } from "../../hooks/savedState";
import Room from "./room/room";
import Settings from "./settings/settings";

interface Props { }
const Component: FunctionComponent<Props> = () => {
    const params = useParams<{ id: string; }>();
    const history = useHistory<{ isServer?: boolean; }>();

    const [server] = useState(new NetworkServer());
    const [displayName, setDisplayName] = useSavedState("", "displayName");
    const [started, setStarted] = useState(false);

    const start = () => {
        if (!displayName) return;
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

    useEffect(() => {
        let unloadListener = () => { server.stop(); };
        let f5Listener = (e: KeyboardEvent) => { if (e.code === "f5") server.stop(); };

        window.addEventListener('beforeunload', unloadListener);
        window.addEventListener('keyup', f5Listener);

        return () => {
            window.removeEventListener('beforeunload', unloadListener);
            window.removeEventListener('keyup', f5Listener);
            server.stop();
        };
    }, [server]);

    const stopServer = () => {
        server.stop();
    };

    return (started && params.id && displayName) ?
        <Room
            sessionId={params.id}
            username={displayName}
            stopServer={stopServer}
        /> :
        <Settings
            displayName={displayName}
            setDisplayName={setDisplayName}
            start={start}
            isServer={history.location.state ? !!history.location.state.isServer : false}
        />;
};

export default Component;