import { FunctionComponent } from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/images/logo.svg";
import "./sitenav.css";

export const SiteNav: FunctionComponent = () => {
  return (
    <nav id="navbar">
      <Link to="/">
        <img src={Logo} alt="Live Demo Logo"></img>
      </Link>
      <div className="nav-links">
        <Link to="/recordings">
          <h5>Recordings</h5>
        </Link>
        <Link to="/join">
          <h5>Join session</h5>
        </Link>
        <Link to="/session">
          <h5 className="outlined-button">Start session</h5>
        </Link>
      </div>
    </nav>
  );
};
