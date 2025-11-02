import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSend, FiMapPin, FiArrowLeft } from "react-icons/fi";
import "./PasabuyerMode.css";

const PasabuyerMode = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [requests, setRequests] = useState([]);
  const [sortedByDistance, setSortedByDistance] = useState(false);

  // Mock data
  const sampleRequests = [
    {
      id: 1,
      item: "Milk Tea (Wintermelon)",
      store: "Gong Cha - SM Fairview",
      distance: 0.8,
      time: "2:30 PM",
    },
    {
      id: 2,
      item: "Jollibee Chickenjoy",
      store: "Jollibee - Commonwealth",
      distance: 1.4,
      time: "3:00 PM",
    },
    {
      id: 3,
      item: "iPhone Cable",
      store: "Digital Walker - Trinoma",
      distance: 3.2,
      time: "4:15 PM",
    },
  ];

  // Toggle Online
  const handleToggle = () => {
    setIsOnline(!isOnline);
    if (!isOnline) {
      setRequests(sampleRequests);
    } else {
      setRequests([]);
    }
  };

  // Sort by Distance
  const handleSort = () => {
    if (!isOnline) return;
    setSortedByDistance(!sortedByDistance);
    const sorted = [...requests].sort((a, b) =>
      sortedByDistance ? a.id - b.id : a.distance - b.distance
    );
    setRequests(sorted);
  };

  // Exit (Back to Home)
  const handleExit = () => {
    navigate("/home");
  };

  return (
    <div className="pasabuyer-container">
      {/* 🔶 HEADER */}
      <header className="pasabuyer-header">
        <div className="header-left">
          <button className="exit-circle" onClick={handleExit}>
            <FiArrowLeft className="exit-icon" />
          </button>
          <div className="header-text">
            <h2>Pasabuyer Mode</h2>
            <p>Accept nearby requests</p>
          </div>
        </div>
      </header>

      {/* 🔶 GO ONLINE CARD */}
      <div className="online-card">
        <div className="online-info">
          <h3>Go Online</h3>
          <p>Start accepting requests</p>
        </div>
        <label className="switch">
          <input type="checkbox" checked={isOnline} onChange={handleToggle} />
          <span className="slider"></span>
        </label>
      </div>

      {/* 🔶 SORT BUTTON */}
      <div className="sort-section">
        <button
          className="sort-btn"
          onClick={handleSort}
          disabled={!isOnline}
          title={!isOnline ? "Go online to sort" : "Sort by distance"}
        >
          <FiMapPin className="sort-icon" />
          Sort by distance
        </button>
      </div>

      {/* 🔶 REQUESTS LIST */}
      <div className="requests-section">
        <h4>Nearby Requests</h4>
        {!isOnline ? (
          <div className="offline-state">
            <FiSend className="offline-icon" />
            <p>
              Go Online to See Requests
              <br />
              <span>
                Toggle Pasabuyer Mode to start accepting nearby requests
              </span>
            </p>
          </div>
        ) : requests.length === 0 ? (
          <p className="empty-text">No nearby requests yet.</p>
        ) : (
          <div className="requests-list">
            {requests.map((req) => (
              <div key={req.id} className="request-card">
                <div className="req-info">
                  <h3>{req.item}</h3>
                  <p className="store">
                    <FiMapPin className="icon" /> {req.store}
                  </p>
                  <p className="details">
                    {req.distance} km away • Pickup at {req.time}
                  </p>
                </div>
                <button className="accept-btn">Accept</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PasabuyerMode;
