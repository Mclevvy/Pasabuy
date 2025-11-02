import React from "react";
import {
  FaStar,
  FaUserEdit,
  FaCreditCard,
  FaCar,
  FaBell,
  FaLock,
  FaQuestionCircle,
  FaSignOutAlt,
} from "react-icons/fa";
import { AiOutlineHome } from "react-icons/ai";
import { FiMap, FiMessageCircle, FiUser } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

const Profile = ({ onLogout }) => {
  const navigate = useNavigate();

  // ✅ Unified logout handler
  const handleLogout = () => {
    if (onLogout) onLogout(); // clears auth state from App.jsx
    navigate("/login", { replace: true }); // redirects to login
  };

  return (
    <div className="profile-container">
      <main className="profile-content">
        {/* Profile Header */}
        <section className="profile-header" aria-label="profile header">
          <div className="profile-info">
            <div className="avatar-wrap">
              <img
                className="profile-avatar"
                src="https://cdn-icons-png.flaticon.com/512/219/219983.png"
                alt="Maria Santos"
              />
            </div>
            <h2 className="profile-name">Maria Santos</h2>
            <p className="profile-email">maria.santos@email.com</p>

            <div className="badges">
              <span className="badge rating">
                <FaStar /> <span>4.8 Rating</span>
              </span>
              <span className="badge top">Top Buyer</span>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="profile-stats" aria-label="user stats">
          <div className="stat-item">
            <h3>24</h3>
            <p>Requests</p>
          </div>
          <div className="stat-item">
            <h3>18</h3>
            <p>Completed</p>
          </div>
          <div className="stat-item">
            <h3>4.8</h3>
            <p>Rating</p>
          </div>
        </section>

        {/* Options Section */}
        <section className="profile-options" aria-label="profile options">
          <button className="option" onClick={() => navigate("/edit-profile")}>
            <div className="icon edit">
              <FaUserEdit />
            </div>
            <div className="option-text">
              <h4>Edit Profile</h4>
              <p>Update your personal information</p>
            </div>
          </button>

          <button className="option" onClick={() => navigate("/payment")}>
            <div className="icon payment">
              <FaCreditCard />
            </div>
            <div className="option-text">
              <h4>Payment Methods</h4>
              <p>Manage your payment options</p>
            </div>
          </button>

          <button className="option" onClick={() => navigate("/vehicle")}>
            <div className="icon vehicle">
              <FaCar />
            </div>
            <div className="option-text">
              <h4>Vehicle Information</h4>
              <p>For pasabuyers (vehicle & permit)</p>
            </div>
          </button>

          <button className="option" onClick={() => navigate("/notifications")}>
            <div className="icon notif">
              <FaBell />
            </div>
            <div className="option-text">
              <h4>Notifications</h4>
              <p>Manage notification preferences</p>
            </div>
          </button>

          <button className="option" onClick={() => navigate("/privacy")}>
            <div className="icon privacy">
              <FaLock />
            </div>
            <div className="option-text">
              <h4>Privacy & Security</h4>
              <p>Control your privacy settings</p>
            </div>
          </button>

          <button className="option" onClick={() => navigate("/help")}>
            <div className="icon help">
              <FaQuestionCircle />
            </div>
            <div className="option-text">
              <h4>Help & Support</h4>
              <p>Get help and contact us</p>
            </div>
          </button>

          {/* ✅ Mobile Logout (Proper navigation) */}
          <button className="option logout mobile-only" onClick={handleLogout}>
            <div className="icon logout-icon">
              <FaSignOutAlt />
            </div>
            <div className="option-text">
              <h4>Logout</h4>
              <p>Sign out from your account</p>
            </div>
          </button>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav" aria-label="mobile navigation">
        <button className="nav-btn" onClick={() => navigate("/")}>
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
        <button className="nav-btn active" onClick={() => navigate("/profile")}>
          <FiUser />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default Profile;
