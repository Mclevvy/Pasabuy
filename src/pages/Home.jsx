import React from "react";
import {
  FaBox,
  FaCarSide,
  FaMapMarkerAlt,
  FaBell,
  FaClock,
  FaMapPin,
} from "react-icons/fa";
import { AiOutlineHome } from "react-icons/ai";
import { FiMap, FiMessageCircle, FiUser } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import logo from "../assets/logo.jpg";

const Home = () => {
  const navigate = useNavigate();

  const requests = [
    {
      id: 1,
      title: "Request 1",
      user: "User 1",
      status: "Accepted",
      location: "Market Street",
      time: "2h ago",
      price: 5000,
    },
    {
      id: 2,
      title: "Request 2",
      user: "User 2",
      status: "Active",
      location: "Downtown Plaza",
      time: "4h ago",
      price: 10000,
    },
    {
      id: 3,
      title: "Request 3",
      user: "User 3",
      status: "Accepted",
      location: "Greenhill Mall",
      time: "1d ago",
      price: 15000,
    },
  ];

  return (
    <div className="home-container">
      {/* ✅ MOBILE HEADER */}
      <header className="mobile-header">
        <img src={logo} alt="Pasabuy Logo" className="mobile-logo" /> {/* ✅ fixed */}
        <h1>Pasabuy</h1>
      </header>

      {/* MAIN CONTENT */}
      <main className="home-content">
        {/* DESKTOP HEADER */}
        <header className="home-header">
          <div className="header-text">
            <p>Welcome back,</p>
            <h2>Hi, Maria!</h2>
          </div>
          <button className="notif-btn" onClick={() => navigate("/notifications")}>
            <FaBell className="notif-icon" />
          </button>
        </header>

        {/* QUICK ACTIONS */}
        <section className="quick-actions">
          <div className="action-card" onClick={() => navigate("/request")}>
            <FaBox className="action-icon" />
            <p>Request Item</p>
          </div>
          <div className="action-card" onClick={() => navigate("/pasabuyer")}>
            <FaCarSide className="action-icon" />
            <p>Pasabuyer</p>
          </div>
          <div className="action-card" onClick={() => navigate("/map")}>
            <FaMapMarkerAlt className="action-icon" />
            <p>Track</p>
          </div>
        </section>

        {/* RECENT REQUESTS */}
        <section className="recent-requests">
          <div className="section-header">
            <h4>Recent Requests</h4>
            <a href="#" className="view-all">
              View All
            </a>
          </div>

          <div className="requests-grid">
            {requests.map((req) => (
              <div className="request-card" key={req.id}>
                <div className="request-card-body">
                  <div className="user">
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/706/706830.png"
                      alt="User"
                    />
                    <div className="user-info">
                      <h5>{req.title}</h5>
                      <p>by {req.user}</p>
                    </div>
                    <span
                      className={`status ${
                        req.status === "Active" ? "active" : "accepted"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <div className="request-info">
                    <span className="info-item">
                      <FaMapPin /> {req.location}
                    </span>
                    <span className="info-item">
                      <FaClock /> {req.time}
                    </span>
                  </div>
                </div>

                <div className="request-footer">
                  <p className="price">₱{req.price.toLocaleString()}</p>
                  <a href="#" className="view-link">
                    View →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SUMMARY */}
        <section className="activity-summary">
          <div className="activity-card">
            <div>
              <h3>12</h3>
              <p>Requests</p>
            </div>
            <div className="divider"></div>
            <div>
              <h3>8</h3>
              <p>Completed</p>
            </div>
            <div className="divider"></div>
            <div>
              <h3>4.8</h3>
              <p>Rating</p>
            </div>
          </div>
        </section>
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="bottom-nav" aria-label="mobile navigation">
        <button className="nav-btn active" onClick={() => navigate("/home")}>
          <AiOutlineHome />
          <span>Home</span>
        </button>
        <button className="nav-btn" onClick={() => navigate("/map")}>
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

export default Home;
