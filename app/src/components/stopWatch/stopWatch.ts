export class StopWatch {
  isPaused: boolean = false;
  private _millisecondsEllapsed: number = 0;
  private _previousDate: Date = new Date();
  static _instance: StopWatch;

  public initStopWatch() {}

  public getTime(): string {
    this.pause();
    var minutes = Math.floor(this._millisecondsEllapsed / 60000);
    var seconds = ((this._millisecondsEllapsed % 60000) / 1000).toFixed(0);
    this.resume();
    return minutes + ":" + (parseInt(seconds) < 10 ? "0" : "") + seconds;
  }

  static get instance() {
    if (StopWatch._instance == null) StopWatch._instance = new StopWatch();
    return this._instance;
  }

  // Begin the timer from the start
  public start() {
    this._millisecondsEllapsed = 0;
    this.isPaused = false;
    this._previousDate = new Date();
  }

  public pause() {
    if (!this.isPaused) {
      this.isPaused = true;
      let currTime = new Date();
      this._millisecondsEllapsed += Math.abs(
        this._previousDate.getTime() - currTime.getTime()
      );
      this._previousDate = currTime;
    } else {
      console.error("StopWatch already paused.");
    }
  }

  public resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this._previousDate = new Date();
    } else {
      console.error("StopWatch already resumed.");
    }
  }
}
