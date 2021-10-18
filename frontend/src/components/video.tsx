import { DetailedHTMLProps, FunctionComponent, ReactEventHandler, useCallback, VideoHTMLAttributes } from "react";

interface Props extends DetailedHTMLProps<VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement> {
    srcObject?: MediaProvider | null;
    paused?: boolean;
}

export const Video: FunctionComponent<Props> = ({ srcObject, paused, onPlay, ...props }) => {
    const onPlayHandler: ReactEventHandler<HTMLVideoElement> = (event) => {
        let element = event.target as HTMLVideoElement;
        if (paused && !element.paused) {
            element.pause();
        } else if (onPlay) {
            onPlay(event);
        }
    };

    const ref = useCallback((element: HTMLVideoElement | null) => {
        if (element) {
            if (srcObject)
                element.srcObject = srcObject;
            if (paused !== undefined && !paused) {
                element.play();
            }
        }
    }, [srcObject, paused]);

    return <video ref={ref} onPlay={onPlayHandler} {...props}>{props.children}</video>;
};
