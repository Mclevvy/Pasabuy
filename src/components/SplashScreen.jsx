import React from "react";
import "./SplashScreen.css";
import logo from "../assets/logo.jpg";

function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-icon">
          <img src={logo} alt="PasaBUY logo" />
        </div>
        <h1 className="splash-title">PasaBUY</h1>
        <p className="splash-subtitle">Shared Buying, Simplified.</p>
        <div className="splash-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
