import { FunctionComponent } from "react";
import { Link } from "react-router-dom";
import Logo from "../../assets/images/logo.svg";
import styles from "./navbar.module.css";

export const SiteNav: FunctionComponent = () => {
  return (
    <nav className={styles.navbar}>
      <Link to="/">
        <img draggable={false} src={Logo} alt="Live Demo Logo"></img>
      </Link>
      <div className={styles.navLinks}>
        <Link to="/recordings">
          <h5>Recordings</h5>
        </Link>
        <Link to="/join">
          <h5>Join session</h5>
        </Link>
        <Link to="/session">
          <h5 className={styles.outlinedButton}>Start session</h5>
        </Link>
      </div>
    </nav>
  );
};
