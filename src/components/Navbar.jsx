import React, { useEffect, useState } from "react";
import { AiOutlineHome, AiOutlineLogout } from "react-icons/ai";
import { FiMessageCircle, FiUser, FiShoppingBag, FiPackage } from "react-icons/fi";
import { MdOutlineRequestPage } from "react-icons/md";
import { FaRobot } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNotification } from "../components/NotificationContext"; // Import the notification context
import logo from "../assets/logo.jpg";
import "./Navbar.css";

const Navbar = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState("home");
  const [user, setUser] = useState(null);
  const [userProfilePic, setUserProfilePic] = useState("https://cdn-icons-png.flaticon.com/512/219/219983.png");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPasabuyerOnline, setIsPasabuyerOnline] = useState(false);
  
  // ✅ Get notification state from context
  const { hasUnreadMessages, unreadCount, clearNotifications } = useNotification();

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Set profile picture from Firebase auth
        if (currentUser.photoURL) {
          setUserProfilePic(currentUser.photoURL);
        } else {
          // Check localStorage for backup
          const storedUser = localStorage.getItem("currentUser");
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              if (userData.photoURL) {
                setUserProfilePic(userData.photoURL);
              }
            } catch (error) {
              console.error("Error parsing stored user:", error);
            }
          }
        }
        
        console.log("Navbar - User updated:", currentUser.displayName);
        // Force re-render when user data changes
        setRefreshKey(prev => prev + 1);
      } else {
        setUser(null);
        // Check localStorage when no auth user
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData.photoURL) {
              setUserProfilePic(userData.photoURL);
            }
          } catch (error) {
            console.error("Error parsing stored user:", error);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for profile picture updates from localStorage
  useEffect(() => {
    const checkProfilePicture = () => {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData.photoURL && userData.photoURL !== userProfilePic) {
            setUserProfilePic(userData.photoURL);
            setRefreshKey(prev => prev + 1);
          }
        } catch (error) {
          console.error("Error parsing stored user:", error);
        }
      }
    };

    // Check initially
    checkProfilePicture();

    // Set up interval to check for changes
    const interval = setInterval(checkProfilePicture, 2000);

    // Listen for storage events (changes from other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'currentUser') {
        checkProfilePicture();
      }
      if (e.key === 'pasabuyerOnline') {
        checkOnlineStatus();
        setRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [userProfilePic]);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/") setActiveMenu("home");
    else if (path.startsWith("/chatbot")) setActiveMenu("chatbot");
    else if (path.startsWith("/chat")) setActiveMenu("chat");
    else if (path.startsWith("/profile")) setActiveMenu("profile");
    else if (path.startsWith("/request")) setActiveMenu("request");
    else if (path.startsWith("/pasabuyer")) setActiveMenu("pasabuyer");
    else if (path.startsWith("/my-pasabuy-requests")) setActiveMenu("myPasabuyRequests");
    else if (path.startsWith("/pasabuyer-history")) setActiveMenu("pasabuyerHistory");
  }, [location.pathname, user]);

  // Check for Pasabuyer online status
  useEffect(() => {
    const checkOnlineStatus = () => {
      const onlineStatus = localStorage.getItem('pasabuyerOnline');
      setIsPasabuyerOnline(onlineStatus === 'true');
    };

    // Check initially
    checkOnlineStatus();

    // Set up interval to check for changes
    const interval = setInterval(checkOnlineStatus, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleSelect = (menu, path) => {
    setActiveMenu(menu);
    
    // ✅ Clear notifications when navigating to chat
    if (menu === "chat") {
      clearNotifications();
    }
    
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      // Clear Pasabuyer online status on logout
      localStorage.removeItem('pasabuyerOnline');
      if (onLogout) onLogout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getUserDisplayName = () => {
    if (!user) {
      // Check localStorage for user data
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          return userData.name || "User";
        } catch (error) {
          return "User";
        }
      }
      return "Guest";
    }
    
    // Priority: displayName > email > "User"
    if (user.displayName && user.displayName.trim() !== "" && user.displayName !== "User") {
      return user.displayName;
    }
    
    if (user.email) {
      return user.email.split('@')[0];
    }
    
    return "User";
  };

  const getStatusText = () => {
    return isPasabuyerOnline ? "Online" : "Offline";
  };

  const getStatusClass = () => {
    return isPasabuyerOnline ? "status-online" : "status-offline";
  };

  const getStatusIndicator = () => {
    return isPasabuyerOnline ? "status-indicator-online" : "status-indicator-offline";
  };

  return (
    <aside className="sidebar" key={refreshKey}>
      {/* Brand */}
      <div
        className="logo-section"
        onClick={() => handleSelect("home", "/")}
        style={{ cursor: "pointer" }}
      >
        <img src={logo} alt="Logo" className="logo-img" />
        <div className="logo-text">
          <h2>PasaBUY</h2>
          <p>Shop Together</p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="scrollable">
        {/* User */}
        <div className="user-section">
          <img
            src={userProfilePic}
            alt="User"
            className="user-avatar"
            onError={(e) => { 
              e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/219/219983.png"; 
            }}
          />
          <div className="user-text">
            <h4>{getUserDisplayName()}</h4>
            <div className="status-container">
              <span className={`status-indicator ${getStatusIndicator()}`}></span>
              <span className={getStatusClass()}>{getStatusText()}</span>
            </div>
          </div>
        </div>

        {/* Main Menu */}
        <div className="menu-section">
          <p className="menu-title">MAIN MENU</p>
          <ul>
            <li
              className={activeMenu === "home" ? "active" : ""}
              onClick={() => handleSelect("home", "/")}
            >
              <AiOutlineHome className="icon" />
              Home
            </li>

            <li
              className={activeMenu === "chatbot" ? "active" : ""}
              onClick={() => handleSelect("chatbot", "/chatbot")}
            >
              <FaRobot className="icon" />
              Chatbot
            </li>

            {/* ✅ Messages with Notification Badge */}
            <li
              className={activeMenu === "chat" ? "active" : ""}
              onClick={() => handleSelect("chat", "/chat")}
            >
              <div className="menu-item-with-badge">
                <FiMessageCircle className="icon" />
                Messages
                {hasUnreadMessages && (
                  <span className={`notification-badge ${unreadCount > 0 ? 'count' : ''}`}>
                    {unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : ''}
                  </span>
                )}
              </div>
            </li>

            <li
              className={activeMenu === "profile" ? "active" : ""}
              onClick={() => handleSelect("profile", "/profile")}
            >
              <FiUser className="icon" />
              Profile
            </li>

            {/* NEW: My Pasabuy Requests */}
            <li
              className={activeMenu === "myPasabuyRequests" ? "active" : ""}
              onClick={() => handleSelect("myPasabuyRequests", "/my-pasabuy-requests")}
            >
              <FiPackage className="icon" />
              My Pasabuy Requests
            </li>
          </ul>
        </div>

        {/* Quick Actions */}
        <div className="menu-section">
          <p className="menu-title">QUICK ACTIONS</p>
          <ul>
            <li
              className={activeMenu === "request" ? "active" : ""}
              onClick={() => handleSelect("request", "/request")}
            >
              <MdOutlineRequestPage className="icon" />
              Request Item
            </li>
            <li
              className={activeMenu === "pasabuyer" ? "active" : ""}
              onClick={() => handleSelect("pasabuyer", "/pasabuyer")}
            >
              <FiShoppingBag className="icon" />
              Pasabuyer Mode
              {isPasabuyerOnline ? (
                <span className="online-indicator"></span>
              ) : (
                <span className="offline-indicator"></span>
              )}
            </li>
            <li
              className={activeMenu === "pasabuyerHistory" ? "active" : ""}
              onClick={() => handleSelect("pasabuyerHistory", "/pasabuyer-history")}
            >
              <FiPackage className="icon" />
              My Pasabuy History
            </li>
          </ul>
        </div>
      </div>

      {/* Logout */}
      <div className="logout-section" onClick={handleLogout}>
        <AiOutlineLogout className="logout-icon" />
        Logout
      </div>
    </aside>
  );
};

export default Navbar;