import React from "react";
import "./SplashScreen.css";
import logo from "../assets/logo.jpg";

const SplashScreen = () => {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-icon">
          <img src={logo} alt="Pasabuy" />
        </div>
        <div className="splash-title">PasaBUY</div>
        <div className="splash-subtitle">Shop Together</div>
        <div className="splash-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
