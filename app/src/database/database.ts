import localforage from "localforage";
import { v4 } from "uuid";

export interface METADATA {
  _uuid: string;
  date: Date;
  duration: string;
  size: number;
  people: string[];
}

localforage.config({
  driver: localforage.INDEXEDDB, // Force WebSQL; same as using setDriver()
  name: "myApp",
  version: 1.0,
  size: 4980736, // Size of database, in bytes. WebSQL-only for now.
  storeName: "keyvaluepairs", // Should be alphanumeric, with underscores.
  description: "some description",
});

export class DataBase {
  private _recordingsDb!: LocalForage;
  private _metadataDb!: LocalForage;
  static _instance: DataBase;

  static get instance() {
    if (DataBase._instance == null) DataBase._instance = new DataBase();
    return this._instance;
  }

  public initDB() {
    this._recordingsDb = localforage.createInstance({
      name: "recordings",
    });
    this._metadataDb = localforage.createInstance({
      name: "metadata",
    });
  }

  public async getAllMetaData(): Promise<METADATA[]> {
    let allMetaData: METADATA[] = [];
    await this._metadataDb
      .iterate(function (
        value: METADATA,
        key: string,
        iterationNumber: number
      ) {
        allMetaData.push(value);
      })
      .then(function (ret) { })
      .catch(function (err) {
        console.log(err);
      });
    return allMetaData;
  }

  public async getRecording(_uuid: string): Promise<Blob> {
    let retval = await this._recordingsDb.getItem(_uuid);
    return retval as Blob;
  }

  public async uploadVideo(
    date: Date,
    duration: string,
    size: number,
    people: string[],
    mp4: Blob
  ): Promise<void> {
    let _uuid: string = v4();
    let metaData: METADATA = {
      _uuid: _uuid,
      date: date,
      duration: duration,
      size: size,
      people: people,
    };
    await this._metadataDb
      .setItem(_uuid, metaData)
      .then(function (value) {
        console.log("metadata uploaded");
      })
      .catch(function (err) {
        console.log(err);
      });
    await this._recordingsDb
      .setItem(_uuid, mp4)
      .then(function (value) {
        console.log("video uploaded");
      })
      .catch(function (err) {
        console.log(err);
      });
  }

  public async deleteVideo(_uuid: string): Promise<void> {
    await this._metadataDb
      .removeItem(_uuid)
      .then(function () {
        console.log("Metadata removed for", _uuid);
      })
      .catch(function (err) {
        console.log(err);
      });
    await this._recordingsDb
      .removeItem(_uuid)
      .then(function () {
        console.log("Recording removed for", _uuid);
      })
      .catch(function (err) {
        console.log(err);
      });
  }
}
