import React, { useEffect } from "react";
import {
  FaSearchPlus,
  FaSearchMinus,
  FaLayerGroup,
  FaLocationArrow,
  FaBell,
} from "react-icons/fa";
import { AiOutlineHome } from "react-icons/ai";
import { FiMap, FiMessageCircle, FiUser } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import "./Map.css";
import logo from "../assets/logo.jpg";

const Map = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const mapDiv = document.getElementById("map");
    mapDiv.innerHTML =
      '<div class="map-placeholder">🗺️ Map will be displayed here (Google Maps integration ready)</div>';
  }, []);

  return (
    <div className="map-page-container">
      {/* 🔹 Desktop Header (Gradient) */}
      <header className="map-header desktop-header">
        <div className="header-text">
          <p>Welcome back 👋</p>
          <h2>Pasabuy Map</h2>
        </div>
        <button className="notif-btn" title="Notifications">
          <FaBell className="notif-icon" />
        </button>
      </header>

      {/* 🔹 Mobile Header (like Home) */}
      {/* ✅ MOBILE HEADER */}
      <header className="mobile-header">
        <img src={logo} alt="Pasabuy Logo" className="mobile-logo" /> {/* ✅ fixed */}
        <h1>Pasabuy</h1>
      </header>

      <main className="map-content">
        {/* 🔹 Legend */}
        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-dot active"></span> Active Request
          </div>
          <div className="legend-item">
            <span className="legend-dot accepted"></span> Accepted
          </div>
          <div className="legend-item">
            <span className="legend-dot location"></span> Your Location
          </div>
        </div>

        {/* 🔹 Map Area */}
        <div id="map"></div>

        {/* 🔹 Map Controls */}
        <div className="map-controls">
          <button title="Zoom In"><FaSearchPlus /></button>
          <button title="Zoom Out"><FaSearchMinus /></button>
          <button title="Map Layers"><FaLayerGroup /></button>
          <button className="direction-btn" title="Locate"><FaLocationArrow /></button>
        </div>
      </main>

      {/* 🔹 Bottom Navigation */}
      <nav className="bottom-nav" aria-label="mobile navigation">
        <button className="nav-btn" onClick={() => navigate("/")}>
          <AiOutlineHome />
          <span>Home</span>
        </button>
        <button className="nav-btn active" onClick={() => navigate("/map")}>
          <FiMap />
          <span>Map</span>
        </button>
        <button className="nav-btn" onClick={() => navigate("/chat")}>
          <FiMessageCircle />
          <span>Chat</span>
        </button>
        <button className="nav-btn" onClick={() => navigate("/profile")}>
          <FiUser />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default Map;
