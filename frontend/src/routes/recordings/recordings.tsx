import { debugPort } from "process";
import localforage from "localforage";
import { FunctionComponent } from "react";
import { DataBase } from "../../database/database";
import { SiteNav } from "../../components/sitenav";

interface Props {}
const Recordings: FunctionComponent<Props> = ({}) => {
  DataBase.instance.initDB();

  const loadVideos = () => {
    DataBase.instance.getAllMetaData().then((res) => {
      console.log(res);
    });
  };

  const uploadVideo = (
    date: Date,
    duration: string,
    size: number,
    people: string[],
    mp4: Blob
  ) => {
    DataBase.instance.uploadVideo(date, duration, size, people, mp4);
  };

  const getVideo = (_uuid: string) => {
    DataBase.instance
      .getRecording(_uuid)
      .then(function (value) {
        console.log(value);
      })
      .catch(function (err) {
        console.log(err);
      });
  };

  if (localforage.supports(localforage.INDEXEDDB)) {
    return (
      <div>
      <SiteNav></SiteNav>
        <button onClick={loadVideos}>Get Videos</button>
        <button
          onClick={() => {
            uploadVideo(new Date(), "1:00", 1024, ["t", "g2"], new Blob());
          }}
        >
          Upload Video
        </button>
        <button
          onClick={() => {
            getVideo("_uuid");
          }}
        >
          Get specific video
        </button>
      </div>
    );
  } else {
    console.log(
      "Your browser doesn't support a stable version of IndexedDB. This feature will not be available."
    );
    return (
      <SiteNav></SiteNav>
      // <div>
      //   Your browser doesn't not support this feature, recordings are not
      //   available.
      // </div>
    );
  }
};

export default Recordings;
