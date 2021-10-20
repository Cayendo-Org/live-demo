import { ChangeEventHandler, FunctionComponent, useState } from "react";
import { useHistory } from "react-router-dom";
import { ReactComponent as DeleteIcon } from "../../assets/icons/delete.svg";
import { ReactComponent as DownloadIcon } from "../../assets/icons/file_download.svg";
import Wink from "../../assets/images/Wink.png";
import { SiteNav } from "../../components/navbar/navbar";
import { DataBase, METADATA } from "../../database/database";
import styles from "./recordings.module.css";

interface Props {}
const Recordings: FunctionComponent<Props> = () => {
  DataBase.instance.initDB();
  const history = useHistory();

  const loadVideos = async () => {
    DataBase.instance.getAllMetaData().then((res) => {
      setRecordings(res);
    });
  };

  const [recordings, setRecordings] = useState<METADATA[] | null>(() => {
    loadVideos();
    return null;
  });

  const onSessionSubmit: ChangeEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    history.push(`/session`);
  };

  const uploadVideo = (
    date: Date,
    duration: string,
    size: number,
    people: string[],
    mp4: Blob
  ) => {
    DataBase.instance
      .uploadVideo(date, duration, size, people, mp4)
      .then(() => {
        loadVideos();
      });
  };

  const getVideo = (metaData: METADATA) => {
    let _uuid = metaData._uuid;
    DataBase.instance
      .getRecording(_uuid)
      .then(function (value) {
        let audioURL = window.URL.createObjectURL(value);
        var a = document.createElement("a");
        a.style.cssText = "display: none";
        document.body.appendChild(a);
        a.href = audioURL;
        a.download = `${getVideoTime(metaData.date)}.webm`;
        a.click();
        window.URL.revokeObjectURL(audioURL);
      })
      .catch(function (err) {
        console.log(err);
      });
  };
  const getVideoTime = (date: Date) => {
    return (date.getMonth() +
      1 +
      "-" +
      date.getDate() +
      "-" +
      date.getFullYear() +
      "-" +
      date.toLocaleString("en-US", {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }));
  };

  const deleteVideo = (_uuid: string) => {
    DataBase.instance
      .deleteVideo(_uuid)
      .then(function (value) {
        loadVideos();
      })
      .catch(function (err) {
        console.log(err);
      });
  };

  if (recordings && recordings.length === 0) {
    return (
      <div className="max-width">
        <SiteNav />
        <form className="card center" onSubmit={onSessionSubmit}>
          <div className={`center ${styles.gap}`}>
            <img draggable="false" src={Wink} alt="" />
            <h4>So empty in here</h4>
            <p>I wonder what that button does...</p>
          </div>
          <button className="primary-btn" type="submit">
            Start session
          </button>
        </form>
      </div>
    );
  }

  if (recordings && recordings.length >= 0) {
    return (
      <div className="max-width">
        <SiteNav />
        <div className={styles.tableWrapper}>
          <h3 className={styles.recordingsSpacing}>Recordings</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Duration</th>
                <th>Size</th>
                <th>People</th>
                <th>Controls</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((item) => (
                <tr key={item._uuid}>
                  <td>{getVideoTime(item.date)}</td>
                  <td>{item["duration"]}</td>
                  <td>{`${JSON.stringify(item.size).slice(0, 5)} MB`}</td>
                  <td>{item.people.join(", ")}</td>
                  <td>
                    <div className={styles.row}>
                      <button
                        title="Download"
                        className="fab-btn"
                        onClick={() => getVideo(item)}
                      >
                        <DownloadIcon />
                      </button>
                      <button
                        title="Delete"
                        className="fab-btn"
                        onClick={() => deleteVideo(item._uuid)}
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="max-width">
      <SiteNav></SiteNav>
    </div>
  );
};

export default Recordings;
