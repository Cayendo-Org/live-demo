import { FunctionComponent, useEffect, useState } from "react";
import { ReactComponent as DrawIcon } from "../../../assets/icons/brush.svg";
import { ReactComponent as EndCallIcon } from "../../../assets/icons/call_end.svg";
import { ReactComponent as MessageIcon } from "../../../assets/icons/chat.svg";
import { ReactComponent as CopyUrlIcon } from "../../../assets/icons/content_copy.svg";
import { ReactComponent as FullscreenIcon } from "../../../assets/icons/fullscreen.svg";
import { ReactComponent as ExitFullscreenIcon } from "../../../assets/icons/fullscreen_exit.svg";
import { ReactComponent as MicOffIcon } from "../../../assets/icons/mic_off.svg";
import { ReactComponent as MicOnIcon } from "../../../assets/icons/mic_on.svg";
// share, mic, cam, play/pause, full (rec class change)
import { ReactComponent as PauseIcon } from "../../../assets/icons/pause.svg";
import { ReactComponent as PlayIcon } from "../../../assets/icons/play.svg";
import { ReactComponent as RecordIcon } from "../../../assets/icons/record.svg";
import { ReactComponent as ScreenShareOffIcon } from "../../../assets/icons/screen_share_off.svg";
import { ReactComponent as ScreenShareOnIcon } from "../../../assets/icons/screen_share_on.svg";
import { ReactComponent as VideocamOffIcon } from "../../../assets/icons/videocam_off.svg";
import { ReactComponent as VideocamOnIcon } from "../../../assets/icons/videocam_on.svg";
import { Video } from "../../../components/video";
import { NetworkClient } from "../../../network/client";
import { Client, Source } from "../../../network/types";
import "./room.css";

interface Props {
  sessionId: string;
}

interface ClientStream {
  clientId: string;
  srcId: string;
}

const Session: FunctionComponent<Props> = ({ sessionId }) => {
  const [client] = useState(new NetworkClient());
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false);
  const [isScreenShareOn, setIsScreenShareOn] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [focusedStream, setFocusedStream] = useState<ClientStream | null>(null);

  useEffect(() => {
    if (!client.isStarted()) {
      client.onClientsChanged = (clients) => {
        console.log("Clients:", clients);
        setClients(clients);
      };

      console.log(`Connecting: ${sessionId}`);

      client.connect(sessionId).then(() => {
        console.log("Connected");
        copyPageUrl();
      });
    }
  }, [client, sessionId]);

  const getStream = (feed: ClientStream): MediaStream | null => {
    const client = clients.find((client => client.id === feed.clientId));
    if (!client) return null;

    const source = client.sources.find((source => source.id === feed.srcId));
    if (!source) return null;

    return source.stream;
  };

  const toggleRecording = () => {
    if (isRecording) {
      // client.endRecording();
      setIsRecording(false);
    } else {
      // client.startRecording();
      setIsRecording(true);
    }
    setIsRecordingPaused(true);
  };

  const toggleRecordingState = () => {
    if (isRecording) {
      if (isRecordingPaused) {
        // client.resumeRecording();
        setIsRecordingPaused(false);
      } else {
        // client.pauseRecording();
        setIsRecordingPaused(true);
      }
    } else {
      setIsRecordingPaused(true);
      console.log("Cannot pause/play since recording is not active.");
    }
  };

  const toggleCamera = () => {
    if (isCameraOn) {
      // client.endCamera();
      setIsCameraOn(false);
    } else {
      client.startCamera().then((src: Source) => {
        if (!focusedStream) {
          setFocusedStream({
            clientId: client.id,
            srcId: src.id
          });
        }
        setIsCameraOn(true);
      });
    }
  };

  const toggleMic = () => {
    if (isMicrophoneOn) {
      // client.endMic();
      setIsMicrophoneOn(false);
    } else {
      // client.startMic();
      setIsMicrophoneOn(true);
    }
  };

  const toggleScreenShare = () => {
    if (isScreenShareOn) {
      // client.endScreenShare();
      setIsScreenShareOn(false);
    } else {
      client.startScreenShare().then((src: Source) => {
        setFocusedStream({
          clientId: client.id,
          srcId: src.id
        });
        setIsScreenShareOn(true);
      });
    }
  };

  const toggleFullScreen = () => {
    if (isFullScreen) {
      // existFullscreen();
      setIsFullScreen(false);
    } else {
      // goFullscreen();
      setIsFullScreen(true);
    }
  };

  const disconnect = () => {
    // client.disconnect();
  };

  const copyPageUrl = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      console.log('Copying to clipboard was successful!');
    }, function (err) {
      console.error('Could not copy text: ', err);
    });
  };

  return (
    <div className="room-wrapper">
      <div className="room-nav">
        <div className="top-nav">
          <button className="fab-btn" onClick={toggleRecording}><RecordIcon /></button>
          {isRecording ? <button className="fab-btn" onClick={toggleRecordingState}> {isRecordingPaused ? <PauseIcon /> : <PlayIcon />}</button> : null}
          <button className="fab-btn" onClick={toggleCamera}> {isCameraOn ? <VideocamOnIcon /> : <VideocamOffIcon />}</button>
          <button className="fab-btn" onClick={toggleMic}> {isMicrophoneOn ? <MicOnIcon /> : <MicOffIcon />}</button>
          <button className="fab-btn" onClick={toggleScreenShare}> {isScreenShareOn ? <ScreenShareOnIcon /> : <ScreenShareOffIcon />}</button>
          <button className="fab-btn end-call" onClick={disconnect}><EndCallIcon /></button>
        </div>
        <div className="bot-nav">
          <button className="fab-btn" onClick={copyPageUrl}><CopyUrlIcon /></button>
          <button className="fab-btn"><DrawIcon /></button>
          <button className="fab-btn"><MessageIcon /></button>
        </div>
      </div>

      <div className="main-view">
        <div className="example-canvas">
          {focusedStream ? <Video className={"video"} autoPlay srcObject={getStream(focusedStream)} /> : null}
        </div>
      </div>

      <div className="side-ex-wrapper">
        <div className="session-header">
          <button className="fab-btn" onClick={toggleFullScreen}> {isFullScreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}</button>
          <div>
            <p>Session code:</p>
            <h3>{sessionId}</h3>
          </div>
        </div>

        <div className="side-wrapper">
          <div className="side-view">
            {clients.flatMap((client) => {
              return client.sources.map((source) => {
                const isFocusedStream = !!focusedStream && (client.id === focusedStream.clientId) && (source.id === focusedStream.srcId);

                return (
                  <div key={`${client.id}${source.id}`} className="example-screen" onClick={() => {
                    if (isFocusedStream) {
                      setFocusedStream(null);
                    } else {
                      setFocusedStream({ clientId: client.id, srcId: source.id });
                    }
                  }}>
                    <Video className={"video"} autoPlay paused={isFocusedStream} srcObject={source.stream} />
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Session;
