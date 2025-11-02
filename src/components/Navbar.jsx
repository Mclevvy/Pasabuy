import React, { useEffect, useState } from "react";
import {
  AiOutlineHome,
  AiOutlineLogout,
} from "react-icons/ai";
import { FiMap, FiMessageCircle, FiUser, FiShoppingBag } from "react-icons/fi";
import { MdOutlineRequestPage } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.jpg";
import "./Navbar.css";

const Navbar = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState("home");

  // Detect current active page
  useEffect(() => {
    const path = location.pathname;
    if (path === "/") setActiveMenu("home");
    else if (path === "/map") setActiveMenu("map");
    else if (path === "/chat") setActiveMenu("chat");
    else if (path === "/profile") setActiveMenu("profile");
    else if (path === "/request") setActiveMenu("request");
    else if (path === "/pasabuyer") setActiveMenu("pasabuyer");
  }, [location.pathname]);

  // Menu select function
  const handleSelect = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  // Logout
  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate("/login");
  };

  return (
    <>
      {/* 🔹 Sidebar with logo */}
      <aside className="sidebar">
        <div className="logo-section">
          <img src={logo} alt="Logo" className="logo-img" />
          <div className="logo-text">
            <h2>PasaBUY</h2>
            <p>Shop Together</p>
          </div>
        </div>

        {/* 🔹 Scrollable Main Section */}
        <div className="scrollable">
          <div className="user-section">
            <img
              src="https://cdn-icons-png.flaticon.com/512/194/194938.png"
              alt="User"
              className="user-avatar"
            />
            <div className="user-text">
              <h4>Maria</h4>
              <p>Active</p>
            </div>
          </div>

          {/* 🔹 Main Menu */}
          <div className="menu-section">
            <p className="menu-title">MAIN MENU</p>
            <ul>
              <li
                className={activeMenu === "home" ? "active" : ""}
                onClick={() => handleSelect("home", "/")}
              >
                <AiOutlineHome className="icon" />
                Home
              </li>
              <li
                className={activeMenu === "map" ? "active" : ""}
                onClick={() => handleSelect("map", "/map")}
              >
                <FiMap className="icon" />
                Map View
              </li>
              <li
                className={activeMenu === "chat" ? "active" : ""}
                onClick={() => handleSelect("chat", "/chat")}
              >
                <FiMessageCircle className="icon" />
                Messages
              </li>
              <li
                className={activeMenu === "profile" ? "active" : ""}
                onClick={() => handleSelect("profile", "/profile")}
              >
                <FiUser className="icon" />
                Profile
              </li>
            </ul>
          </div>

          {/* 🔹 Quick Actions */}
          <div className="menu-section">
            <p className="menu-title">QUICK ACTIONS</p>
            <ul>
              <li
                className={activeMenu === "request" ? "active" : ""}
                onClick={() => handleSelect("request", "/request")}
              >
                <MdOutlineRequestPage className="icon" />
                Request Item
              </li>
              <li
                className={activeMenu === "pasabuyer" ? "active" : ""}
                onClick={() => handleSelect("pasabuyer", "/pasabuyer")}
              >
                <FiShoppingBag className="icon" />
                Pasabuyer Mode
              </li>
            </ul>
          </div>
        </div>

        {/* 🔹 Logout */}
        <div className="logout-section" onClick={handleLogout}>
          <AiOutlineLogout className="logout-icon" />
          Logout
        </div>
      </aside>
    </>
  );
};

export default Navbar;
