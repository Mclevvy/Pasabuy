import React from "react";
import { useNavigate } from "react-router-dom"; // ✅ Import navigate hook
import "./Notifications.css";
import {
  FaCheckCircle,
  FaShoppingBag,
  FaMapMarkerAlt,
  FaEnvelope,
  FaClock,
} from "react-icons/fa";

const Notifications = () => {
  const navigate = useNavigate(); // ✅ Initialize navigate

  const notifications = [
    {
      id: 1,
      icon: <FaCheckCircle className="icon success" />,
      title: "Request Accepted",
      description: "John D. accepted your request for iPhone 15 Pro",
      time: "5 minutes ago",
      highlight: true,
    },
    {
      id: 2,
      icon: <FaMapMarkerAlt className="icon info" />,
      title: "On the Way",
      description: "Your pasabuyer is heading to the pickup location",
      time: "10 minutes ago",
      highlight: true,
    },
    {
      id: 3,
      icon: <FaEnvelope className="icon message" />,
      title: "New Message",
      description: "Sarah L. sent you a message",
      time: "1 hour ago",
    },
    {
      id: 4,
      icon: <FaShoppingBag className="icon success" />,
      title: "Purchase Completed",
      description: "Your Nike Air Jordan 1 has been purchased",
      time: "2 hours ago",
    },
    {
      id: 5,
      icon: <FaClock className="icon warning" />,
      title: "New Request Near You",
      description: "Someone requested a MacBook near your area",
      time: "3 hours ago",
    },
    {
      id: 6,
      icon: <FaCheckCircle className="icon success" />,
      title: "Delivery Completed",
      description: "You successfully delivered PlayStation 5 to Mike T.",
      time: "5 hours ago",
    },
  ];

  return (
    <div className="notifications-page">
      <header className="notifications-header">
        {/* ✅ Working Back Button */}
        <button className="back-btn" onClick={() => navigate("/")}>
          ←
        </button>
        <div>
          <h2>Notifications</h2>
          <p>Stay updated with your requests</p>
        </div>
      </header>

      <main className="notifications-list">
        {notifications.map((note) => (
          <div
            key={note.id}
            className={`notification-card ${
              note.highlight ? "highlight" : ""
            }`}
          >
            <div className="notification-icon">{note.icon}</div>
            <div className="notification-content">
              <h3>{note.title}</h3>
              <p>{note.description}</p>
              <span className="time">{note.time}</span>
            </div>
          </div>
        ))}
      </main>

      <footer className="mark-all">Mark all as read</footer>
    </div>
  );
};

export default Notifications;
