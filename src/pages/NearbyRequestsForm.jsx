import React, { useState } from "react";
import { FiShoppingBag, FiClock, FiUser, FiDollarSign, FiMessageCircle, FiSend, FiMapPin, FiX, FiMail } from "react-icons/fi";
import "./NearbyRequestsForm.css";

const NearbyRequestsForm = ({ 
  requests, 
  loading, 
  isOnline, 
  onAcceptRequest, 
  onShowMap,
  onRequestSelect,
  onNotifyBuyer,
  onSendMessage
}) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [message, setMessage] = useState("");

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedRequest(null);
    setMessage("");
  };

  const handleSendMessage = async () => {
    if (message.trim() && selectedRequest) {
      const success = await onSendMessage(selectedRequest, message);
      if (success) {
        setMessage("");
        handleCloseModal();
      }
    }
  };

  return (
    <div className="requests-section">
      <div className="requests-header">
        <h4>Nearby Requests (within 5 km)</h4>
        {isOnline && (
          <span className="requests-count">
            {loading ? "Loading..." : `${requests.length} requests found`}
          </span>
        )}
      </div>
      
      {!isOnline ? (
        <div className="offline-state">
          <FiSend className="offline-icon" />
          <p>
            Go Online to See Requests
            <br />
            <span>
              Toggle Pasabuyer Mode to start accepting nearby requests within 5 km radius
            </span>
          </p>
        </div>
      ) : loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading nearby requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <FiMapPin className="empty-icon" />
          <p>No nearby requests within 5 km radius.</p>
          <span>Check back later or try moving to a different location.</span>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((request) => (
            <RequestCard 
              key={request.id}
              request={request}
              onAccept={onAcceptRequest}
              onShowMap={onShowMap}
              onSelect={onRequestSelect}
              onViewDetails={handleViewDetails}
              onNotifyBuyer={onNotifyBuyer}
            />
          ))}
        </div>
      )}

      {/* Request Details Modal */}
      {showDetailsModal && selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={handleCloseModal}
          message={message}
          setMessage={setMessage}
          onSendMessage={handleSendMessage}
          onAcceptRequest={onAcceptRequest}
        />
      )}
    </div>
  );
};

// Sub-component para sa individual request card
const RequestCard = ({ request, onAccept, onShowMap, onSelect, onViewDetails, onNotifyBuyer }) => {
  return (
    <div 
      id={`request-${request.id}`}
      className="request-card"
    >
      <div className="req-header">
        <div className="item-header">
          {request.imageUrl && (
            <img 
              src={request.imageUrl} 
              alt={request.title}
              className="item-image"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <h3 className="item-name">{request.title}</h3>
        </div>
        <span className="distance-badge" style={{background: '#28a745'}}>
          {request.distance} km away
        </span>
      </div>
      
      <div className="req-details">
        <div className="detail-row">
          <FiShoppingBag className="detail-icon" />
          <div className="detail-info">
            <strong>Store:</strong> {request.storeLocation || request.location}
            <div className="store-location">{request.storeLocation}</div>
          </div>
        </div>
        
        <div className="detail-row">
          <FiClock className="detail-icon" />
          <div className="detail-info">
            <strong>Posted:</strong> {request.time}
            {request.pickupDate && (
              <div className="pickup-time">
                Preferred pickup: {new Date(request.pickupDate).toLocaleString()}
              </div>
            )}
          </div>
        </div>
        
        <div className="detail-row">
          <FiUser className="detail-icon" />
          <div className="detail-info">
            <strong>Requester:</strong> {request.user}
            <div className="contact-info">{request.contact}</div>
          </div>
        </div>
        
        <div className="detail-row">
          <FiDollarSign className="detail-icon" />
          <div className="detail-info">
            <strong>Budget:</strong> ₱{request.price?.toLocaleString() || '0'} 
            <span className="earnings" style={{color: '#28a745'}}> • You earn: ₱{request.estimatedEarnings}</span>
          </div>
        </div>
        
        {request.specialInstructions && request.specialInstructions !== "No special instructions" && (
          <div className="detail-row">
            <FiMessageCircle className="detail-icon" />
            <div className="detail-info">
              <strong>Instructions:</strong> {request.specialInstructions}
            </div>
          </div>
        )}
        
        <div className="item-details">
          <strong>Item Details:</strong> {request.itemDetails}
          {request.quantity > 1 && (
            <span className="quantity-badge">Qty: {request.quantity}</span>
          )}
        </div>
      </div>
      
      <div className="card-actions">
        <button 
          className="view-details-btn"
          onClick={() => onViewDetails(request)}
        >
          <FiMessageCircle className="btn-icon" />
          View Details
        </button>
        <button 
          className="accept-btn"
          onClick={() => onAccept(request)}
          style={{background: '#28a745'}}
        >
          <FiSend className="btn-icon" />
          Accept Request
        </button>
      </div>

      <div className="card-actions-secondary">
        <button 
          className="notify-buyer-btn"
          onClick={() => onNotifyBuyer(request)}
        >
          <FiMail className="btn-icon" />
          Notify Buyer
        </button>
        <button 
          className="view-on-map-btn"
          onClick={() => {
            onShowMap();
            onSelect(request);
          }}
        >
          <FiMapPin className="btn-icon" />
          View on Map
        </button>
      </div>
    </div>
  );
};

// Modal Component para sa Request Details
const RequestDetailsModal = ({ 
  request, 
  onClose, 
  message, 
  setMessage, 
  onSendMessage, 
  onAcceptRequest 
}) => {
  return (
    <div className="modal-overlay">
      <div className="request-details-modal">
        <div className="modal-header">
          <h3>Request Details</h3>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-content">
          <div className="request-summary">
            <div className="summary-header">
              {request.imageUrl && (
                <img 
                  src={request.imageUrl} 
                  alt={request.title}
                  className="summary-image"
                />
              )}
              <div className="summary-info">
                <h4>{request.title}</h4>
                <span className="distance-badge">{request.distance} km away</span>
              </div>
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <FiUser className="detail-icon" />
                <div>
                  <strong>Requester</strong>
                  <p>{request.user}</p>
                </div>
              </div>
              
              <div className="detail-item">
                <FiShoppingBag className="detail-icon" />
                <div>
                  <strong>Store Location</strong>
                  <p>{request.storeLocation}</p>
                </div>
              </div>
              
              <div className="detail-item">
                <FiDollarSign className="detail-icon" />
                <div>
                  <strong>Budget</strong>
                  <p>₱{request.price?.toLocaleString() || '0'}</p>
                </div>
              </div>
              
              <div className="detail-item">
                <FiDollarSign className="detail-icon" />
                <div>
                  <strong>You Earn</strong>
                  <p style={{color: '#28a745', fontWeight: 'bold'}}>₱{request.estimatedEarnings}</p>
                </div>
              </div>
              
              <div className="detail-item">
                <FiClock className="detail-icon" />
                <div>
                  <strong>Posted</strong>
                  <p>{request.time}</p>
                </div>
              </div>
              
              <div className="detail-item">
                <FiMessageCircle className="detail-icon" />
                <div>
                  <strong>Contact</strong>
                  <p>{request.contact}</p>
                </div>
              </div>
            </div>

            {request.specialInstructions && request.specialInstructions !== "No special instructions" && (
              <div className="special-instructions">
                <h5>Special Instructions</h5>
                <p>{request.specialInstructions}</p>
              </div>
            )}

            <div className="item-details-full">
              <h5>Item Details</h5>
              <p>{request.itemDetails}</p>
              {request.quantity > 1 && (
                <span className="quantity-badge">Quantity: {request.quantity}</span>
              )}
            </div>
          </div>

          {/* Chat Section */}
          <div className="chat-section">
            <h5>Send Message to {request.user}</h5>
            <div className="message-input-container">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here... (e.g., Hi! I can help you with your request. When would you like to meet?)"
                className="message-input"
                rows="3"
              />
              <button 
                onClick={onSendMessage}
                disabled={!message.trim()}
                className="send-message-btn"
              >
                <FiSend className="btn-icon" />
                Send Message
              </button>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button 
            className="accept-request-btn"
            onClick={() => {
              onAcceptRequest(request);
              onClose();
            }}
          >
            <FiSend className="btn-icon" />
            Accept This Request
          </button>
          <button 
            className="close-modal-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NearbyRequestsForm;