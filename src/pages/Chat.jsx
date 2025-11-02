import React from "react";
import "./Chat.css";
import { AiOutlineHome } from "react-icons/ai";
import { FiMap, FiMessageCircle, FiUser } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.jpg";

const messages = [
  {
    id: 1,
    name: "John D.",
    avatar: "https://cdn-icons-png.flaticon.com/512/706/706830.png",
    message: "Thanks! I'll pick it up today.",
    time: "2m ago",
    online: true,
    unread: 0,
  },
  {
    id: 2,
    name: "Sarah L.",
    avatar: "https://cdn-icons-png.flaticon.com/512/2922/2922561.png",
    message: "Is the item still available?",
    time: "1h ago",
    online: false,
    unread: 2,
  },
  {
    id: 3,
    name: "Mike T.",
    avatar: "https://cdn-icons-png.flaticon.com/512/4140/4140047.png",
    message: "On my way to deliver!",
    time: "3h ago",
    online: true,
    unread: 0,
  },
];

const Chat = () => {
  const navigate = useNavigate();

  return (
    <div className="chat-container">
      {/* MOBILE STICKY HEADER */}
      <header className="mobile-header">
              <img src={logo} alt="Pasabuy Logo" className="mobile-logo" /> {/* ✅ fixed */}
              <h1>Pasabuy</h1>
            </header>

      <main className="chat-content">
        {/* HEADER */}
        <header className="chat-header">
          <div>
            <h2>Messages</h2>
            <p>Chat with your pasabuyers</p>
          </div>
        </header>

        {/* MESSAGE CARDS */}
        <section className="chat-list">
          {messages.map((chat) => (
            <div className="chat-card" key={chat.id}>
              <div className="chat-user">
                <img src={chat.avatar} alt={chat.name} />
                {chat.online && <span className="online-dot"></span>}
              </div>

              <div className="chat-info">
                <div className="chat-top">
                  <h4>{chat.name}</h4>
                  <span className="chat-time">{chat.time}</span>
                </div>
                <p className="chat-message">{chat.message}</p>
              </div>

              {chat.unread > 0 && (
                <div className="unread-badge">{chat.unread}</div>
              )}
            </div>
          ))}
        </section>
      </main>

      {/* BOTTOM NAV (mobile only) */}
      <nav className="bottom-nav" aria-label="mobile navigation">
        <button className="nav-btn" onClick={() => navigate("/")}>
          <AiOutlineHome />
          <span>Home</span>
        </button>
        <button className="nav-btn" onClick={() => navigate("/map")}>
          <FiMap />
          <span>Map</span>
        </button>
        <button className="nav-btn active" onClick={() => navigate("/chat")}>
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

export default Chat;
