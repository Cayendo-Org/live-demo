import { debugPort } from "process";
import localforage from "localforage";
import { FunctionComponent, useState } from "react";
import { DataBase, METADATA } from "../../database/database";
import { SiteNav } from "../../components/sitenav";
import "./table.css";
import { ReactComponent as Svg } from "../../animations/animate.svg";
import { Link } from "react-router-dom";

interface Props {}
const Recordings: FunctionComponent<Props> = ({}) => {
  DataBase.instance.initDB();

  const loadVideos = () => {
    DataBase.instance.getAllMetaData().then((res) => {
      setRecordings(res);
    });
  };

  const [recordings, setRecordings] = useState<METADATA[] | null>(() => {
    loadVideos();
    return null;
  });

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
        alert("download video ".concat(_uuid));
      })
      .catch(function (err) {
        console.log(err);
      });
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
        <SiteNav></SiteNav>
        <div className="dialog">
          <div className="recording-none">
            <img draggable="false" src="./assets/Wink.png" alt=""></img>
            <h4>So empty in here</h4>
            <p>I wonder what that button does...</p>
          </div>
          <Link to="/start">
            <button className="primary-btn">Start session</button>
          </Link>
        </div>
      </div>
    );
  } else if (recordings && recordings.length >= 0) {
    return (
      <div className="max-width">
        <SiteNav></SiteNav>
        <h3>Recordings</h3>
        <table>
          <tbody>
            <tr>
              <th>Date</th>
              <th>Duration</th>
              <th>Size</th>
              <th>People</th>
              <th>Controls</th>
            </tr>
            {recordings.map((item, key) => (
              <tr key={key}>
                <td>
                  {item.date.getMonth() +
                    1 +
                    "-" +
                    item.date.getDate() +
                    "-" +
                    item.date.getFullYear() +
                    " - " +
                    item.date.toLocaleString("en-US", {
                      timeZone:
                        Intl.DateTimeFormat().resolvedOptions().timeZone,
                      hour: "numeric",
                      minute: "numeric",
                      hour12: true,
                    })}
                </td>
                <td>{item["duration"]}</td>
                <td>{JSON.stringify(item.size)}</td>
                <td>{item.people.join(", ")}</td>
                <td>
                  <button onClick={() => getVideo(item._uuid)}>Download</button>
                  <button onClick={() => deleteVideo(item._uuid)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    return (
      <div className="max-width">
        <SiteNav></SiteNav>
      </div>
    );
  }
};

export default Recordings;
