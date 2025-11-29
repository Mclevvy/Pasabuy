import React, { useState } from "react";
import { FiX, FiMessageCircle, FiCheck, FiMapPin, FiUser, FiPhone, FiShoppingBag, FiDollarSign, FiClock, FiInfo } from "react-icons/fi";
import "./ViewDetails.css";

const ViewDetails = ({ request, onClose, onSendMessage, onAcceptRequest }) => {
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("details");

  const handleSendMessage = () => {
    if (message.trim()) {
      const success = onSendMessage(request, message);
      if (success) {
        setMessage("");
      }
    }
  };

  const handleAcceptRequest = () => {
    if (window.confirm(`Are you sure you want to accept this request?\n\nItem: ${request.title}\nStore: ${request.storeLocation}\nYou'll earn: ₱${request.estimatedEarnings}`)) {
      onAcceptRequest(request);
      onClose();
    }
  };

  const handleNotifyInterest = () => {
    if (window.confirm(`Notify ${request.user} that you're interested in this request?`)) {
      onSendMessage(request, `Hi! I'm interested in your pasabuy request for ${request.title}. Can I get more details?`);
    }
  };

  if (!request) return null;

  return (
    <div className="view-details-overlay">
      <div className="view-details-modal">
        {/* HEADER */}
        <div className="details-header">
          <div className="header-content">
            <h2>Request Details</h2>
            <p>Complete information about this pasabuy request</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {/* TABS */}
        <div className="details-tabs">
          <button 
            className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            <FiInfo className="tab-icon" />
            Request Details
          </button>
          <button 
            className={`tab-btn ${activeTab === "location" ? "active" : ""}`}
            onClick={() => setActiveTab("location")}
          >
            <FiMapPin className="tab-icon" />
            Location Info
          </button>
          <button 
            className={`tab-btn ${activeTab === "contact" ? "active" : ""}`}
            onClick={() => setActiveTab("contact")}
          >
            <FiUser className="tab-icon" />
            Contact
          </button>
        </div>

        <div className="details-content">
          {/* REQUEST SUMMARY CARD */}
          <div className="summary-card">
            <div className="item-image">
              {request.imageUrl ? (
                <img src={request.imageUrl} alt={request.title} />
              ) : (
                <div className="image-placeholder-large">📦</div>
              )}
            </div>
            <div className="summary-info">
              <h3>{request.title}</h3>
              <div className="summary-meta">
                <span className="distance-badge">
                  <FiMapPin />
                  {request.distance} km away
                </span>
                <span className="time-badge">
                  <FiClock />
                  {request.time}
                </span>
                <span className="earnings-badge">
                  <FiDollarSign />
                  ₱{request.estimatedEarnings}
                </span>
              </div>
            </div>
          </div>

          {/* DETAILS TAB */}
          {activeTab === "details" && (
            <div className="tab-content">
              <div className="details-grid">
                <div className="detail-row">
                  <FiUser className="detail-icon" />
                  <div className="detail-info">
                    <label>Requester</label>
                    <span>{request.user}</span>
                  </div>
                </div>

                <div className="detail-row">
                  <FiShoppingBag className="detail-icon" />
                  <div className="detail-info">
                    <label>Item Details</label>
                    <span>{request.itemDetails}</span>
                  </div>
                </div>

                <div className="detail-row">
                  <FiMapPin className="detail-icon" />
                  <div className="detail-info">
                    <label>Store Location</label>
                    <span>{request.storeLocation}</span>
                  </div>
                </div>

                <div className="detail-row">
                  <FiDollarSign className="detail-icon" />
                  <div className="detail-info">
                    <label>Budget</label>
                    <span className="budget-amount">₱{request.price?.toLocaleString() || '0'}</span>
                  </div>
                </div>

                {request.quantity > 1 && (
                  <div className="detail-row">
                    <div className="detail-info">
                      <label>Quantity</label>
                      <span>{request.quantity} items</span>
                    </div>
                  </div>
                )}

                <div className="detail-row full-width">
                  <div className="detail-info">
                    <label>Special Instructions</label>
                    <span className="instructions">{request.specialInstructions}</span>
                  </div>
                </div>

                {request.note && (
                  <div className="detail-row full-width">
                    <div className="detail-info">
                      <label>Requester's Note</label>
                      <span className="requester-note">{request.note}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LOCATION TAB */}
          {activeTab === "location" && (
            <div className="tab-content">
              <div className="location-info">
                <div className="map-preview">
                  <div className="static-map">
                    <div className="map-placeholder">
                      <FiMapPin className="map-pin-large" />
                      <p>Store Location</p>
                      <span>{request.storeLocation}</span>
                    </div>
                  </div>
                </div>

                <div className="location-details">
                  <h4>📍 Location Details</h4>
                  <div className="location-meta">
                    <div className="location-item">
                      <strong>Distance from you:</strong>
                      <span>{request.distance} kilometers</span>
                    </div>
                    <div className="location-item">
                      <strong>Store Address:</strong>
                      <span>{request.storeLocation}</span>
                    </div>
                    <div className="location-item">
                      <strong>Location Source:</strong>
                      <span className="source-badge">{request.coordinatesSource || "Store coordinates"}</span>
                    </div>
                    {request.actualLatitude && (
                      <div className="location-item">
                        <strong>Coordinates:</strong>
                        <span>{request.actualLatitude.toFixed(6)}, {request.actualLongitude.toFixed(6)}</span>
                      </div>
                    )}
                  </div>

                  <div className="location-tips">
                    <h5>💡 Tips for this location:</h5>
                    <ul>
                      <li>Check store operating hours before going</li>
                      <li>Confirm item availability with the store</li>
                      <li>Consider parking and accessibility</li>
                      <li>Plan your route for efficiency</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONTACT TAB */}
          {activeTab === "contact" && (
            <div className="tab-content">
              <div className="contact-info">
                <div className="contact-card">
                  <div className="contact-header">
                    <FiUser className="contact-icon" />
                    <div>
                      <h4>{request.user}</h4>
                      <p>Requester</p>
                    </div>
                  </div>

                  <div className="contact-details">
                    <div className="contact-item">
                      <FiPhone className="contact-item-icon" />
                      <div>
                        <label>Contact Number</label>
                        <span className="phone-number">{request.contact}</span>
                      </div>
                    </div>

                    <div className="contact-item">
                      <FiClock className="contact-item-icon" />
                      <div>
                        <label>Request Time</label>
                        <span>{new Date(request.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MESSAGING SECTION */}
                <div className="messaging-section">
                  <h5>Send Message to {request.user}</h5>
                  <div className="message-input-group">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={`Type your message to ${request.user}...`}
                      rows="4"
                      className="message-input"
                    />
                    <div className="message-actions">
                      <button 
                        className="btn-secondary"
                        onClick={handleNotifyInterest}
                      >
                        👍 Express Interest
                      </button>
                      <button 
                        className="btn-primary"
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                      >
                        <FiMessageCircle />
                        Send Message
                      </button>
                    </div>
                  </div>

                  <div className="message-templates">
                    <p>Quick messages:</p>
                    <div className="template-buttons">
                      <button 
                        className="template-btn"
                        onClick={() => setMessage(`Hi ${request.user}! I can help with your ${request.title} request. Is this still available?`)}
                      >
                        "Is this still available?"
                      </button>
                      <button 
                        className="template-btn"
                        onClick={() => setMessage(`Hello! I'm near ${request.storeLocation}. Can I get more details about the ${request.title}?`)}
                      >
                        "Need more details"
                      </button>
                      <button 
                        className="template-btn"
                        onClick={() => setMessage(`Hi! I can go to ${request.storeLocation} now. Should I proceed with your ${request.title}?`)}
                      >
                        "I can go now"
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="details-actions">
          <button className="btn-cancel" onClick={onClose}>
            <FiX />
            Close
          </button>
          <button 
            className="btn-accept-large"
            onClick={handleAcceptRequest}
          >
            <FiCheck />
            Accept This Request
            <span className="earnings-label">Earn ₱{request.estimatedEarnings}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewDetails;