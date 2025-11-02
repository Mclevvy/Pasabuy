import React from "react";
import { AiOutlineHome } from "react-icons/ai";
import { FiMessageCircle, FiUser, FiMap } from "react-icons/fi";
import { MdOutlineRequestPage } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";
import "./BottomNav.css";

/**
 * ✅ Responsive Bottom Navigation Bar
 * Appears only on mobile screens.
 * Works consistently across all pages.
 */
const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname;

  // Helper function for navigation and active highlighting
  const isActive = (path) => current === path;

  return (
    <nav className="bottom-nav">
      <button
        className={isActive("/") ? "active" : ""}
        onClick={() => navigate("/")}
        aria-label="Home"
      >
        <AiOutlineHome />
      </button>

      <button
        className={isActive("/map") ? "active" : ""}
        onClick={() => navigate("/map")}
        aria-label="Map View"
      >
        <FiMap />
      </button>

      <button
        className={isActive("/request") ? "active" : ""}
        onClick={() => navigate("/request")}
        aria-label="Request Item"
      >
        <MdOutlineRequestPage />
      </button>

      <button
        className={isActive("/chat") ? "active" : ""}
        onClick={() => navigate("/chat")}
        aria-label="Messages"
      >
        <FiMessageCircle />
      </button>

      <button
        className={isActive("/profile") ? "active" : ""}
        onClick={() => navigate("/profile")}
        aria-label="Profile"
      >
        <FiUser />
      </button>
    </nav>
  );
};

export default BottomNav;
