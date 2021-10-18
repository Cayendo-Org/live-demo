import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import "./App.css";
import Join from "./routes/cards/join";
import SessionEnd from "./routes/cards/session-end";
import Home from "./routes/home/home";
import Recordings from "./routes/recordings/recordings";
import Session from "./routes/session/index";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/join">
          <Join></Join>
        </Route>
        <Route path="/recordings">
          <Recordings></Recordings>
        </Route>
        <Route path={["/session/:id", "/session"]}>
          <Session></Session>
        </Route>
        <Route path="/session-end">
          <SessionEnd></SessionEnd>
        </Route>
        <Route path="/">
          <Home></Home>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
