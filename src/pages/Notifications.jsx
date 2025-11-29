import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Notifications.css";
import {
  FaCheckCircle,
  FaUser,
  FaStore,
  FaArrowLeft,
  FaBell,
  FaHeart
} from "react-icons/fa";

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sample notifications data - REQUEST ACCEPTED AND BUYER INTERESTED ONLY
  const sampleNotifications = [
    {
      id: 1,
      type: 'accepted_request',
      title: 'Request Accepted',
      description: 'Your pasabuy request has been accepted by John Doe',
      store: 'SM Supermarket',
      requester: 'John Doe',
      budget: 1500,
      estimatedEarnings: 200,
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      highlight: true,
      requestId: 123
    },
    {
      id: 2,
      type: 'buyer_interested',
      title: 'Buyer Interested!',
      description: 'Sarah Johnson is interested in your pasabuy offer',
      store: 'Puregold',
      buyer: 'Sarah Johnson',
      budget: 2000,
      estimatedEarnings: 250,
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      highlight: true,
      requestId: 124
    },
    {
      id: 3,
      type: 'accepted_request',
      title: 'Request Accepted',
      description: 'Your pasabuy request has been accepted by Mike Santos',
      store: 'Robinsons Mall',
      requester: 'Mike Santos',
      budget: 1800,
      estimatedEarnings: 220,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      highlight: false,
      requestId: 125
    },
    {
      id: 4,
      type: 'buyer_interested',
      title: 'Buyer Interested!',
      description: 'Maria Garcia is interested in your pasabuy offer',
      store: 'Walter Mart',
      buyer: 'Maria Garcia',
      budget: 1200,
      estimatedEarnings: 150,
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      highlight: false,
      requestId: 126
    }
  ];

  // Load notifications from localStorage
  useEffect(() => {
    const loadNotifications = () => {
      setIsLoading(true);
      try {
        const savedNotifications = JSON.parse(localStorage.getItem('pasabuyNotifications') || '[]');
        
        if (savedNotifications.length === 0) {
          // Use sample data if no notifications exist
          setNotifications(sampleNotifications);
          localStorage.setItem('pasabuyNotifications', JSON.stringify(sampleNotifications));
        } else {
          setNotifications(savedNotifications);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
        setNotifications(sampleNotifications);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();

    // Listen for real-time updates
    window.addEventListener('notificationUpdate', loadNotifications);

    return () => {
      window.removeEventListener('notificationUpdate', loadNotifications);
    };
  }, []);

  // Get appropriate icon based on notification type
  const getNotificationIcon = (notification) => {
    switch (notification.type) {
      case 'accepted_request':
        return <FaCheckCircle className="icon success" />;
      case 'buyer_interested':
        return <FaHeart className="icon heart" />;
      default:
        return <FaCheckCircle className="icon success" />;
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read
    handleMarkAsRead(notification.id);
    
    // Navigate to appropriate page based on notification type
    switch (notification.type) {
      case 'accepted_request':
        navigate("/request-tracking", { state: { requestId: notification.requestId } });
        break;
      case 'buyer_interested':
        navigate("/chat", { state: { requestId: notification.requestId } });
        break;
      default:
        break;
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      highlight: false
    }));
    setNotifications(updatedNotifications);
    localStorage.setItem('pasabuyNotifications', JSON.stringify(updatedNotifications));
  };

  // Format time difference
  const getTimeDifference = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return notificationTime.toLocaleDateString();
  };

  // Clear all notifications
  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all notifications?")) {
      setNotifications([]);
      localStorage.setItem('pasabuyNotifications', '[]');
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = (notificationId) => {
    const updatedNotifications = notifications.map(notification =>
      notification.id === notificationId 
        ? { ...notification, highlight: false }
        : notification
    );
    setNotifications(updatedNotifications);
    localStorage.setItem('pasabuyNotifications', JSON.stringify(updatedNotifications));
  };

  if (isLoading) {
    return (
      <div className="notifications-page">
        <header className="notifications-header">
          <button className="back-btn" onClick={() => navigate("/home")}>
            <FaArrowLeft />
          </button>
          <div className="header-content">
            <h2>Notifications</h2>
            <p>Loading your notifications...</p>
          </div>
        </header>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <header className="notifications-header">
        <button 
          className="back-btn" 
          onClick={() => navigate("/home")}
          aria-label="Go back"
        >
          <FaArrowLeft />
        </button>
        <div className="header-content">
          <h2>Notifications</h2>
          <p>Stay updated with your requests</p>
        </div>
        {notifications.length > 0 && (
          <div className="notification-count">
            {notifications.filter(n => n.highlight).length}
          </div>
        )}
      </header>

      {notifications.length > 0 ? (
        <>
          <main className="notifications-list">
            {/* Activity Notifications Only */}
            <div className="notifications-section">
              <h3 className="section-title">Activity Updates</h3>
              <div className="section-content">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-card ${
                      notification.highlight ? "highlight" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-icon">
                      {getNotificationIcon(notification)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-header">
                        <h3>{notification.title}</h3>
                        <span className="time">
                          {getTimeDifference(notification.timestamp)}
                        </span>
                      </div>
                      <p className="notification-description">{notification.description}</p>
                      
                      {/* Show additional details for both notification types */}
                      <div className="request-details">
                        <div className="detail-row">
                          <div className="detail-item">
                            <FaStore className="detail-icon" />
                            <span>{notification.store}</span>
                          </div>
                          <div className="detail-item">
                            <FaUser className="detail-icon" />
                            <span>
                              {notification.type === 'accepted_request' 
                                ? `Accepted by: ${notification.requester}`
                                : `Interested buyer: ${notification.buyer}`
                              }
                            </span>
                          </div>
                        </div>
                        <div className="financial-details">
                          <span className="budget">Budget: ₱{notification.budget?.toLocaleString()}</span>
                          <span className="earnings">Earnings: ₱{notification.estimatedEarnings?.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    {notification.highlight && (
                      <div className="unread-indicator"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </main>

          <footer className="notifications-footer">
            <button 
              className="mark-all-btn" 
              onClick={handleMarkAllAsRead}
              disabled={!notifications.some(n => n.highlight)}
            >
              Mark all as read
            </button>
            <button className="clear-all-btn" onClick={handleClearAll}>
              Clear all
            </button>
          </footer>
        </>
      ) : (
        <div className="no-notifications">
          <div className="no-notifications-icon">
            <FaBell />
          </div>
          <h3>No notifications yet</h3>
          <p>When someone accepts or shows interest in your requests, they will appear here</p>
          <button 
            className="go-online-btn"
            onClick={() => navigate("/create-request")}
          >
            Create a Request
          </button>
        </div>
      )}
    </div>
  );
};

export default Notifications;