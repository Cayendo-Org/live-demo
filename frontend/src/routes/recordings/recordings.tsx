import { debugPort } from "process";
import localforage from "localforage";
import { FunctionComponent, useState } from "react";
import { DataBase, METADATA } from "../../database/database";
import { SiteNav } from "../../components/sitenav";
import "./recordings.css";
import { ReactComponent as Svg } from "../../animations/animate.svg";
import { Link } from "react-router-dom";
import Wink from "../../assets/Wink.png";

interface Props {}
const Recordings: FunctionComponent<Props> = ({}) => {
  DataBase.instance.initDB();

  const loadVideos = async () => {
    // await DataBase.instance.uploadVideo(
    //   new Date(),
    //   "1:15",
    //   10024,
    //   ["Tomasz", "Brian", "Julian"],
    //   new Blob()
    // );
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
    DataBase.instance
      .uploadVideo(date, duration, size, people, mp4)
      .then(() => {
        loadVideos();
      });
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
            <img draggable="false" src={Wink} alt=""></img>
            <h4>So empty in here</h4>
            <p>I wonder what that button does...</p>
          </div>
          <Link to="/start">
            <button className="primary-btn">Start session</button>
          </Link>
          <button
            className="primary-btn"
            onClick={() => {
              uploadVideo(
                new Date(),
                "1:15",
                10024,
                ["Tomasz", "Brian", "Julian"],
                new Blob()
              );
            }}
          >
            (TEMP) Upload video
          </button>
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
        <button
            className="primary-btn"
            onClick={() => {
              uploadVideo(
                new Date(),
                "1:15",
                10024,
                ["Tomasz", "Brian", "Julian"],
                new Blob()
              );
            }}
          >
            (TEMP) Upload video
          </button>
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
