import React from "react";
import logo from "./logo.svg";
import "./App.css";
import { Route, Switch, BrowserRouter as Router } from "react-router-dom";
import Home from "./routes/home/home";
import Start from "./routes/home/start";
import Recordings from "./routes/recordings/recordings";

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
          <Start></Start>
        </Route>
        <Route path="/">
          <Home></Home>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
