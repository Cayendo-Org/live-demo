import { Component, FunctionComponent } from "react";
import "./sitenav.css";
import Logo from "../assets/logo.svg";
import { Link } from "react-router-dom";

export const SiteNav: FunctionComponent = () => {
  return (
    <nav id="navbar">
      <Link to="/">
        <img src={Logo} alt="Live Demo Logo"></img>
      </Link>
      <div className="nav-links">
        <Link to="/session-end">
          <h5>(TEMP) session-end</h5>
        </Link>
        <Link to="/room">
          <h5>(TEMP) room</h5>
        </Link>
        <Link to="/recordings">
          <h5>Recordings</h5>
        </Link>
        <Link to="/join">
          <h5>Join session</h5>
        </Link>
        <Link to="/start">
          <h5 className="outlined-button">Start session</h5>
        </Link>
      </div>
    </nav>
  );
};
