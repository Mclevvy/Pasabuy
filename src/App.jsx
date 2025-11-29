import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

// ✅ Components
import Navbar from "./components/Navbar";
import SplashScreen from "./components/SplashScreen";
import PasabuyerHistory from "./pages/PasabuyerHistory";
import MyPasabuyRequests from "./pages/MyPasabuyRequests";

// ✅ Pages
import Home from "./pages/Home";
import Chatbot from "./pages/Chatbot";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Request from "./pages/Request";
import PasabuyerMode from "./pages/PasabuyerMode";
import Notifications from "./pages/Notifications";

// ✅ Context
import { NotificationProvider, useNotification } from "./components/NotificationContext";

import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // 🕒 Show splash screen for 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // 🔑 Load auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    console.log("Token found:", token);
    setIsAuthenticated(!!token);
    setAuthChecked(true);
  }, []);

  // ✅ Handle Login
  const handleLogin = (token) => {
    localStorage.setItem("authToken", token);
    setIsAuthenticated(true);
  };

  // ✅ Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("pasabuyerOnline");
    setIsAuthenticated(false);
  };

  // ✅ Show Splash first
  if (showSplash) return <SplashScreen />;

  // ✅ Wait for auth check to complete before showing routes
  if (!authChecked) {
    return (
      <div className="loading-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <Router>
        <AppRoutes
          isAuthenticated={isAuthenticated}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      </Router>
    </NotificationProvider>
  );
}

// ✅ Routes logic
function AppRoutes({ isAuthenticated, onLogin, onLogout }) {
  const navigate = useNavigate();
  const { clearNotifications } = useNotification();

  // ✅ Redirect if trying to access /login or /register when already logged in
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (isAuthenticated && (currentPath === "/login" || currentPath === "/register")) {
      navigate("/home", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // ✅ Clear notifications when navigating to chat page
  useEffect(() => {
    const handleRouteChange = () => {
      if (window.location.pathname === "/chat") {
        clearNotifications();
      }
    };

    // Listen for route changes
    const handlePopState = () => {
      setTimeout(handleRouteChange, 100);
    };

    // Check current route on mount
    handleRouteChange();

    // Listen for browser back/forward
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [clearNotifications]);

  return (
    <Routes>
      {/* ========= ROOT PATH REDIRECT ========= */}
      <Route 
        path="/" 
        element={
          isAuthenticated ? (
            <Navigate to="/home" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />

      {/* ========= PUBLIC ROUTES ========= */}
      {!isAuthenticated && (
        <>
          <Route path="/login" element={<Login onLogin={onLogin} />} />
          <Route path="/register" element={<Register onLogin={onLogin} />} />
        </>
      )}

      {/* ========= PRIVATE ROUTES ========= */}
      {isAuthenticated && (
        <>
          <Route
            path="/home"
            element={
              <>
                <Navbar onLogout={onLogout} />
                <Home />
              </>
            }
          />
          <Route
            path="/chatbot"
            element={
              <>
                <Navbar onLogout={onLogout} />
                <Chatbot />
              </>
            }
          />
          <Route
            path="/chat"
            element={
              <>
                <Navbar onLogout={onLogout} />
                <ChatWithNotificationClear />
              </>
            }
          />
          <Route
            path="/profile"
            element={
              <>
                <Navbar onLogout={onLogout} />
                <Profile onLogout={onLogout} />
              </>
            }
          />
          <Route
            path="/request"
            element={
              <>
                <Navbar onLogout={onLogout} />
                <Request />
              </>
            }
          />
          <Route
            path="/pasabuyer"
            element={
              <>
                <Navbar onLogout={onLogout} />
                <PasabuyerMode />
              </>
            }
          />
          <Route
            path="/notifications"
            element={
              <>
                <Navbar onLogout={onLogout} />
                <Notifications />
              </>
            }
          />
          
          {/* ========= NEW ROUTES ========= */}
          <Route
            path="/pasabuyer-history"
            element={
              <>
                <Navbar onLogout={onLogout} />
                <PasabuyerHistory />
              </>
            }
          />
          <Route
            path="/my-pasabuy-requests"
            element={
              <>
                <Navbar onLogout={onLogout} />
                <MyPasabuyRequests />
              </>
            }
          />
        </>
      )}

      {/* ========= FALLBACK ROUTE ========= */}
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <Navigate to="/home" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

// ✅ Wrapper component for Chat that clears notifications
function ChatWithNotificationClear() {
  const { clearNotifications } = useNotification();

  useEffect(() => {
    // Clear notifications when chat component mounts
    clearNotifications();
  }, [clearNotifications]);

  return <Chat />;
}

export default App;