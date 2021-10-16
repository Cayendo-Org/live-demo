export const enum SOURCE_TYPE {
    CAMERA,
    SCREEN_SHARE
}

export interface Source {
    type: SOURCE_TYPE;
    stream: MediaStream;
}

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

export interface User {
    id: string;
    name: string;
    sources: Source[];
}

export interface ServerUser extends User {
    dataChannel: RTCDataChannel;
    pc: RTCPeerConnection;
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
    NEW_USER,
    ICE,
    SDP,
}

export interface Message {
    type: MESSAGE_TYPE;
    data: any;
}