import React from "react";
import { AiOutlineHome } from "react-icons/ai";
import { FiMessageCircle, FiUser } from "react-icons/fi";
import { FaRobot } from "react-icons/fa6";
import { useLocation, useNavigate } from "react-router-dom";
import "./BottomNav.css";

/**
 * Mobile Bottom Navigation (≤768px).
 * Exact matching so /chatbot never highlights /chat (and vice-versa).
 */
const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // exact-or-nested matcher ("/route" or "/route/..."), but prevents overlaps
  const match = (base) => pathname === base || pathname.startsWith(base + "/");

  const isHome = pathname === "/" || match("/home");
  const isChatbot = match("/chatbot");
  const isChat = match("/chat");
  const isProfile = match("/profile");

  return (
    <nav className="bn" aria-label="mobile navigation">
      <button
        className={`bn-item ${isHome ? "active" : ""}`}
        onClick={() => navigate("/")}
        aria-current={isHome ? "page" : undefined}
        aria-label="Home"
      >
        <AiOutlineHome className="bn-icon" />
        <span className="bn-label">Home</span>
      </button>

      <button
        className={`bn-item ${isChatbot ? "active" : ""}`}
        onClick={() => navigate("/chatbot")}
        aria-current={isChatbot ? "page" : undefined}
        aria-label="Chatbot"
      >
        <FaRobot className="bn-icon" />
        <span className="bn-label">Chatbot</span>
      </button>

      <button
        className={`bn-item ${isChat ? "active" : ""}`}
        onClick={() => navigate("/chat")}
        aria-current={isChat ? "page" : undefined}
        aria-label="Chat"
      >
        <FiMessageCircle className="bn-icon" />
        <span className="bn-label">Chat</span>
      </button>

      <button
        className={`bn-item ${isProfile ? "active" : ""}`}
        onClick={() => navigate("/profile")}
        aria-current={isProfile ? "page" : undefined}
        aria-label="Profile"
      >
        <FiUser className="bn-icon" />
        <span className="bn-label">Profile</span>
      </button>
    </nav>
  );
};

export default BottomNav;
