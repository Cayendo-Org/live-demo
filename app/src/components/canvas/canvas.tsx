import {
  DetailedHTMLProps,
  FunctionComponent,
  useCallback,
  CanvasHTMLAttributes,
  useState,
  useEffect,
  useRef,
  Dispatch,
  SetStateAction,
} from "react";
import { DataBase } from "../../database/database";
import { StopWatch } from "../stopWatch/stopWatch";
import styles from "./canvas.module.css";

interface Props
  extends DetailedHTMLProps<
    CanvasHTMLAttributes<HTMLVideoElement>,
    HTMLVideoElement
  > {
  srcObject: MediaStream | null;
  isRecording: boolean;
  isRecordingPaused: boolean;
  clientNames: string[];
  setRecordingPaused: Dispatch<SetStateAction<boolean>>;
}

export const Canvas: FunctionComponent<Props> = ({ srcObject, ...props }) => {
  StopWatch.instance.initStopWatch();
  const recordingChunks = useRef<BlobPart[]>([]);
  const source = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const isRecording = useRef<boolean>(false);
  const clientNames = useRef<string[]>([]);
  const [reader, setReader] = useState<any | null>(null);

  const ref = useCallback(
    (element: HTMLCanvasElement | null) => {
      //@ts-ignore
      if (window.MediaStreamTrackProcessor && element) {
        canvasRef.current = element;
        source.current = srcObject ? srcObject : null;
        if (srcObject) {
          //@ts-ignore
          const processor = new MediaStreamTrackProcessor(
            srcObject.getVideoTracks()[0]
          );
          const reader = processor.readable.getReader();
          setReader(reader);
        }
      }
    },
    [srcObject]
  );

  useEffect(() => {
    clientNames.current = props.clientNames;
  }, [props.clientNames]);

  useEffect(() => {
    const readChunk = (displayingSrcId: string) => {
      if (reader) {
        reader.read().then((res: any) => {
          const { done, value }: { done: Boolean; value: VideoFrame } = res;
          const canvas = canvasRef.current;
          if (
            !done &&
            canvas &&
            source.current &&
            displayingSrcId === source.current.id
          ) {
            // Adjust for MediaStream videos with dynamic sizes
            if (
              canvas.width !== value.displayWidth ||
              canvas.height !== value.displayHeight
            ) {
              canvas.width = value.displayWidth;
              canvas.height = value.displayHeight;
            }
            const context = canvas.getContext("2d");
            if (context) {
              context.clearRect(0, 0, canvas.width, canvas.height);
              context.drawImage(value, 0, 0, canvas.width, canvas.height);
              value.close(); // close the VideoFrame when we're done with it
              readChunk(displayingSrcId);
            }
          } else if (value) {
            value.close(); // close the VideoFrame when we're done with it
          }
        });
      }
    };

    if (canvasRef.current && reader && source.current) {
        readChunk(source.current.id);
    }
  }, [reader, source]);

  useEffect(() => {
    isRecording.current = props.isRecording;
    if (!props.isRecording && mediaRecorder.current) {
      mediaRecorder.current.stop();
      props.setRecordingPaused(true);
    } else {
      if (canvasRef.current) {
        let mediaStream = canvasRef.current.captureStream();
        console.log("Recording started");
        var options = {
          // audioBitsPerSecond: 128000,
          // videoBitsPerSecond: 3500000,
          mimeType: "video/webm; codecs=vp9",
        };
        let newMediaRecorder = new MediaRecorder(mediaStream, options);
        newMediaRecorder.start();
        StopWatch.instance.start();
        newMediaRecorder.ondataavailable = (event) => {
          recordingChunks.current.push(event.data);
        };

        newMediaRecorder.onstop = (event) => {
          console.log("Recording stopped");
          let blob = new Blob(recordingChunks.current, {
            type: "audio/ogg; codecs=opus",
          });
          DataBase.instance.uploadVideo(
            new Date(),
            StopWatch.instance.getTime(),
            blob.size / 1048576,
            clientNames.current,
            blob
          );
          console.log("Recording saved");
          recordingChunks.current = [];
        };
        mediaRecorder.current = newMediaRecorder;
      }
    }
  }, [props.isRecording]);

  useEffect(() => {
    if (isRecording.current && mediaRecorder.current) {
      if (!props.isRecordingPaused) {
        console.log("Recording paused");
        mediaRecorder.current.pause();
        StopWatch.instance.pause();
      } else {
        console.log("Recording resumed");
        mediaRecorder.current.resume();
        StopWatch.instance.resume();
      }
    }
  }, [props.isRecordingPaused]);

  return (
    <canvas ref={ref} className={styles.canvas}>
      {props.children}
    </canvas>
  );
};
