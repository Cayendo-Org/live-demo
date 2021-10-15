import React from "react";
import logo from "./logo.svg";
import "./App.css";
import { Route, Switch, BrowserRouter as Router } from "react-router-dom";
import Home from "./routes/home/home";
import Start from "./routes/cards/start";
import Recordings from "./routes/recordings/recordings";
import Join from "./routes/cards/join";
import SessionEnd from "./routes/cards/session-end";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/start">
          <Start></Start>
        </Route>
        <Route path="/recordings">
          <Recordings></Recordings>
        </Route>
        <Route path="/join">
          <Join></Join>
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
