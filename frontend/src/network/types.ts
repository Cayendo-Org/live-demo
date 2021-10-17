export const enum SIGNALLING_MESSAGE_TYPE {
    SESSION_CREATE,
    CONNECT,
    ICE,
}

export interface SignallingMessage<T extends SIGNALLING_MESSAGE_TYPE> {
    id: string;
    type: T;
    data: SignallingMessageOptions[T];
}

export interface Client {
    id: string;
    name: string;
    sources: Source[];
}

export interface ServerClient extends Client {
    dataChannel: RTCDataChannel;
    pc: RTCPeerConnection;
    ready: boolean;
}

export interface SessionCreateOptions {
    id: string;
}

export interface ConnectOptions {
    description: RTCSessionDescription;
    id: string; // Session
}

export interface ICEOptions {
    candidate: RTCIceCandidate;
}

export interface SignallingMessageOptions {
    [SIGNALLING_MESSAGE_TYPE.SESSION_CREATE]: SessionCreateOptions,
    [SIGNALLING_MESSAGE_TYPE.CONNECT]: ConnectOptions,
    [SIGNALLING_MESSAGE_TYPE.ICE]: ICEOptions,
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

export const enum MESSAGE_TYPE {
    JOIN,
    LEAVE,
    SOURCE_SYNC,
    ICE,
}

export interface MessageOptions {
    [MESSAGE_TYPE.SOURCE_SYNC]: SourceSyncOptions,
    [MESSAGE_TYPE.ICE]: ICEOptions,
    [MESSAGE_TYPE.JOIN]: JoinOptions,
    [MESSAGE_TYPE.LEAVE]: LeaveOptions,
}

export interface JoinOptions {
    id: string;
}

export interface LeaveOptions {
    id: string;
}

export const enum SOURCE_TYPE {
    CAMERA,
    SCREEN_SHARE
}

export interface SourceDescription {
    type: SOURCE_TYPE;
    id: string;
}

export interface Source extends SourceDescription {
    stream: MediaStream | null;
}

export interface SourceSyncOptions {
    description: RTCSessionDescription;
    clients: SourceSyncClient[];
}

export interface SourceSyncClient {
    id: string;
    sources: SourceDescription[];
}

export interface Message<T extends MESSAGE_TYPE> {
    type: MESSAGE_TYPE;
    data: MessageOptions[T];
}