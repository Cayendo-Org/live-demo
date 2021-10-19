import { FunctionComponent, useEffect, useState } from "react";
import { useHistory } from "react-router";
import { NetworkClient } from "../../../../../shared/client";
import { Client, NETWORK_STATE, Source } from "../../../../../shared/types";
import { ReactComponent as DrawIcon } from "../../../assets/icons/brush.svg";
import { ReactComponent as EndCallIcon } from "../../../assets/icons/call_end.svg";
import { ReactComponent as MessageIcon } from "../../../assets/icons/chat.svg";
import { ReactComponent as CopyUrlIcon } from "../../../assets/icons/content_copy.svg";
import { ReactComponent as FullscreenIcon } from "../../../assets/icons/fullscreen.svg";
import { ReactComponent as ExitFullscreenIcon } from "../../../assets/icons/fullscreen_exit.svg";
import { ReactComponent as MicOffIcon } from "../../../assets/icons/mic_off.svg";
import { ReactComponent as MicOnIcon } from "../../../assets/icons/mic_on.svg";
import { ReactComponent as PauseIcon } from "../../../assets/icons/pause.svg";
import { ReactComponent as PlayIcon } from "../../../assets/icons/play.svg";
import { ReactComponent as RecordIcon } from "../../../assets/icons/record.svg";
import { ReactComponent as ScreenShareOffIcon } from "../../../assets/icons/screen_share_off.svg";
import { ReactComponent as ScreenShareOnIcon } from "../../../assets/icons/screen_share_on.svg";
import { ReactComponent as VideocamOffIcon } from "../../../assets/icons/videocam_off.svg";
import { ReactComponent as VideocamOnIcon } from "../../../assets/icons/videocam_on.svg";
import { ReactComponent as LargePreloader } from "../../../assets/images/preloader.svg";
import { Video } from "../../../components/video/video";
import { DataBase } from "../../../database/database";
import styles from "./room.module.css";

interface Props {
  sessionId: string;
}

interface ClientStream {
  clientId: string;
  srcId: string;
}

const Session: FunctionComponent<Props> = ({ sessionId }) => {
  DataBase.instance.initDB();
  let recordingChunks: BlobPart[] = [];
  const history = useHistory();
  const [client] = useState(new NetworkClient());
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false);
  const [isScreenShareOn, setIsScreenShareOn] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder>();
  const [clients, setClients] = useState<Client[]>([]);
  const [networkState, setNetworkState] = useState<NETWORK_STATE>(
    NETWORK_STATE.DISCONNECTED
  );
  const [focusedStream, setFocusedStream] = useState<ClientStream | null>(null);

  useEffect(() => {
    if (!client.isStarted()) {
      client.onClientsChanged = (clients) => {
        console.log("Clients:", clients);
        setClients(clients);
      };

      client.onNetworkStateChange = (state) => {
        setNetworkState(state);
      };

      console.log(`Connecting: ${sessionId}`);
      client.connect(sessionId).then(() => {
        console.log("Connected");
        copyPageUrl();
      });
    }
  }, [client, sessionId]);

  const getStream = (feed: ClientStream): MediaStream | null => {
    const client = clients.find((client) => client.id === feed.clientId);
    if (!client) return null;

    const source = client.sources.find((source) => source.id === feed.srcId);
    if (!source) return null;

    return source.stream;
  };

  const toggleRecording = () => {
    if (isRecording && mediaRecorder) {
      console.log("Recording stopped");
      mediaRecorder.stop();
      setIsRecording(false);
    } else {
      if (focusedStream) {
        let mediaStream = getStream(focusedStream);
        if (mediaStream) {
          console.log("Recording started");
          var options = {
            // audioBitsPerSecond: 128000,
            // videoBitsPerSecond: 3500000,
            mimeType: "video/webm; codecs=vp9",
          };
          let mediaRecorder = new MediaRecorder(mediaStream, options);
          mediaRecorder.start();
          setIsRecording(true);

          mediaRecorder.ondataavailable = (event) => {
            recordingChunks.push(event.data);
          };

          mediaRecorder.onstop = (event) => {
            console.log("Recording stopped");
            let blob = new Blob(recordingChunks, {
              type: "audio/ogg; codecs=opus",
            });
            DataBase.instance.uploadVideo(new Date, "0:37", blob.size/1048576, clients.map((client)=>{return client.name}), blob)
            console.log("Recording saved");
            recordingChunks = [];
          };
          setMediaRecorder(mediaRecorder);
        }
      }
    }
    setIsRecordingPaused(true);
  };

  const getAllClients = () => {
    return clients.map((client)=>{return client.name})
  };

  const toggleRecordingState = () => {
    if (isRecording && mediaRecorder) {
      if (isRecordingPaused) {
        console.log("Recording paused");
        mediaRecorder.pause();
        setIsRecordingPaused(false);
      } else {
        console.log("Recording resumed");
        mediaRecorder.resume();
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
            srcId: src.id,
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
          srcId: src.id,
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
    history.push("/session-end");
  };

  const copyPageUrl = () => {
    navigator.clipboard.writeText(window.location.href).then(
      () => {
        console.log("Copying to clipboard was successful!");
      },
      function (err) {
        console.error("Could not copy text: ", err);
      }
    );
  };

  if (networkState !== NETWORK_STATE.CONNECTED) {
    return (
      <div className={styles.preloaderCenter}>
        <LargePreloader />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.roomNav}>
        <div className={styles.topNav}>
          <button
            title="Toggle recording"
            className={`fab-btn`}
            onClick={toggleRecording}
          >
            <RecordIcon className={isRecording ? styles.recordOn : ""} />
          </button>
          {isRecording ? (
            <button
              title="Toggle play and pause"
              className="fab-btn"
              onClick={toggleRecordingState}
            >
              {" "}
              {isRecordingPaused ? <PauseIcon /> : <PlayIcon />}
            </button>
          ) : null}
          <button
            title="Toggle videocamera"
            className="fab-btn"
            onClick={toggleCamera}
          >
            {" "}
            {isCameraOn ? <VideocamOnIcon /> : <VideocamOffIcon />}
          </button>
          <button
            title="Toggle microphone"
            className="fab-btn"
            onClick={toggleMic}
          >
            {" "}
            {isMicrophoneOn ? <MicOnIcon /> : <MicOffIcon />}
          </button>
          <button
            title="Toggle screenshare"
            className="fab-btn"
            onClick={toggleScreenShare}
          >
            {" "}
            {isScreenShareOn ? <ScreenShareOnIcon /> : <ScreenShareOffIcon />}
          </button>
          <button
            title="End call"
            className={`fab-btn ${styles.endCall}`}
            onClick={disconnect}
          >
            <EndCallIcon />
          </button>
        </div>
        <div className={styles.botNav}>
          <button
            title="Copy session URL"
            className="fab-btn"
            onClick={copyPageUrl}
          >
            <CopyUrlIcon />
          </button>
          <button title="Open drawing panel" className="fab-btn">
            <DrawIcon />
          </button>
          <button title="Open messaging panel" className="fab-btn">
            <MessageIcon />
          </button>
        </div>
      </div>

      <div className={styles.mainView}>
        <div className={styles.exampleCanvasWrapper}>
          <div className={styles.exampleCanvas}>
            {focusedStream ? (
              <Video
                className={styles.video}
                autoPlay
                srcObject={getStream(focusedStream)}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.sideExWrapper}>
        <div className={styles.sessionHeader}>
          <div>
            <p>Session code: </p>
            <h3>{sessionId}</h3>
          </div>
          <button
            title="Toggle fullscreen mode"
            className="fab-btn"
            onClick={toggleFullScreen}
          >
            {" "}
            {isFullScreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </button>
        </div>

        {isFullScreen ? null : (
          <div className={styles.sideWrapper}>
            <div className={styles.sideView}>
              {clients.flatMap((client) => {
                return client.sources.map((source) => {
                  const isFocusedStream =
                    !!focusedStream &&
                    client.id === focusedStream.clientId &&
                    source.id === focusedStream.srcId;
                  return (
                    <div
                      title={
                        isFocusedStream ? `Remove from focus` : `Click to focus`
                      }
                      key={`${client.id}${source.id}`}
                      className={styles.exampleScreen}
                      onClick={() => {
                        if (isFocusedStream) {
                          setFocusedStream(null);
                        } else {
                          setFocusedStream({
                            clientId: client.id,
                            srcId: source.id,
                          });
                        }
                      }}
                    >
                      <div className={styles.focusTint}>
                        <Video
                          className={`${styles.video} ${styles.preview}`}
                          autoPlay
                          paused={isFocusedStream}
                          srcObject={source.stream}
                        />
                        {/* <VideocamOnIcon className={styles.focusCam}></VideocamOnIcon> */}
                      </div>
                    </div>
                  );
                });
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Session;
