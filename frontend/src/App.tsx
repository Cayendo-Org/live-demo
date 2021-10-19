import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Home from "./routes/home/home";
import Join from "./routes/join/join";
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
        <Route path="/">
          <Home></Home>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
