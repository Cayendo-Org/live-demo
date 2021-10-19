//#region Coordinator
export const enum COORDINATOR_MESSAGE_TYPE {
    SESSION_CREATE,
    CONNECT,
    ICE,
}

export interface CoordinatorMessage<T extends COORDINATOR_MESSAGE_TYPE> {
    id: string;
    type: T;
    data: CoordinatorMessageOptions[T];
}

export interface CoordinatorMessageOptions {
    [COORDINATOR_MESSAGE_TYPE.SESSION_CREATE]: SessionCreateOptions,
    [COORDINATOR_MESSAGE_TYPE.CONNECT]: ConnectOptions,
    [COORDINATOR_MESSAGE_TYPE.ICE]: ICEOptions,
}

export interface ICEOptions {
    candidate: RTCIceCandidate;
}

export interface ConnectOptions {
    description: RTCSessionDescription;
    id: string; // Session
}

export interface SessionCreateOptions {
    id: string;
}

//#endregion

//#region Message
export const enum MESSAGE_TYPE {
    JOIN,
    LEAVE,
    ICE,
    SDP,
    ADD_SOURCE,
    REMOVE_SOURCE,
}

export interface Message<T extends MESSAGE_TYPE> {
    type: MESSAGE_TYPE;
    data: MessageOptions[T];
}

export interface MessageOptions {
    [MESSAGE_TYPE.ICE]: ICEOptions,
    [MESSAGE_TYPE.JOIN]: JoinOptions,
    [MESSAGE_TYPE.LEAVE]: LeaveOptions,
    [MESSAGE_TYPE.SDP]: SDPOptions,
    [MESSAGE_TYPE.ADD_SOURCE]: AddSourceOptions,
    [MESSAGE_TYPE.REMOVE_SOURCE]: RemoveSourceOptions,
}

export interface JoinOptions {
    id: string;
    name: string;
}

export interface LeaveOptions {
    id: string;
}

export interface AddSourceOptions {
    client: string;
    source: SourceDescription;
}

export interface RemoveSourceOptions {
    client: string;
    source: string;
}

export interface SDPOptions {
    description: RTCSessionDescription;
}

export interface SourceSyncClient {
    id: string;
    sources: SourceDescription[];
}
//#endregion

//#region Source
export const enum SOURCE_TYPE {
    CAMERA,
    SCREEN_SHARE
}

export const SOURCE_NAMES = {
    [SOURCE_TYPE.CAMERA]: "camera",
    [SOURCE_TYPE.SCREEN_SHARE]: "screen",
};

export interface SourceDescription {
    type: SOURCE_TYPE;
    id: string;
}

export interface Source extends SourceDescription {
    stream: MediaStream | null;
}
//#endregion

//#region Other
export const enum NETWORK_STATE {
    DISCONNECTED,
    COORDINATOR_CONNECTING, // Connecting to coordinator
    COORDINATOR_CONNECTED, // Connected to coordinator
    CONNECTING, // Connecting to server
    CONNECTED, // Connected to server
}

export interface Client {
    id: string;
    name: string;
    sources: Source[];
    state: NETWORK_STATE;
}

export interface ServerClient extends Client {
    dataChannel: RTCDataChannel;
    pc: RTCPeerConnection;
}

export const CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: "turn:129.213.138.47",
            username: "webrtc",
            credential: "696969"
        }
    ]
};
//#endregion