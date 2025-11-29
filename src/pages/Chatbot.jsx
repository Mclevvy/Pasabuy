import React, { useEffect } from "react";
import { FaBell } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import "./Chatbot.css";
import logo from "../assets/logo.jpg";

const Chatbot = () => {
  const navigate = useNavigate();

  // Initialize Botpress Webchat
  useEffect(() => {
    // Check if scripts are already loaded to avoid duplicates
    if (!document.querySelector('script[src*="botpress"]')) {
      const script1 = document.createElement('script');
      script1.src = 'https://cdn.botpress.cloud/webchat/v3.4/inject.js';
      script1.async = true;
      
      const script2 = document.createElement('script');
      script2.src = 'https://files.bpcontent.cloud/2025/11/13/06/20251113064326-4T56PA31.js';
      script2.defer = true;
      
      document.head.appendChild(script1);
      document.head.appendChild(script2);
    }

    // Cleanup function
    return () => {
      const scripts = document.querySelectorAll('script[src*="botpress"]');
      scripts.forEach(script => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      });
    };
  }, []);

  return (
    <div className="chatbot-page">
      {/* Desktop header */}
      <header className="desktop-header">
        <div className="header-content">
          <p>Welcome back 👋</p>
          <h2>Pasabuy Chatbot</h2>
        </div>
        <button className="notif-btn" onClick={() => navigate("/notifications")} aria-label="Notifications">
          <FaBell />
        </button>
      </header>

      {/* Mobile header */}
      <header className="mobile-header">
        <img src={logo} alt="Pasabuy" className="mobile-logo" />
        <h1>Pasabuy</h1>
        <button className="notif-btn mobile-notif" onClick={() => navigate("/notifications")} aria-label="Notifications">
          <FaBell />
        </button>
      </header>

      {/* Botpress Embedded Webchat */}
      <main className="chatbot-main">
        <div className="chatbot-container">
          <div id="bp-embedded-webchat"></div>
        </div>
      </main>

      {/* Mobile nav */}
      <BottomNav />
    </div>
  );
};

export default Chatbot;