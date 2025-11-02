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

// ✅ Pages
import Home from "./pages/Home";
import Map from "./pages/Map";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Request from "./pages/Request";
import PasabuyerMode from "./pages/PasabuyerMode";
import Notifications from "./pages/Notifications";

import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // 🕒 Show splash screen for 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // 🔑 Load auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    setIsAuthenticated(!!token);
  }, []);

  // ✅ Handle Login
  const handleLogin = (token) => {
    localStorage.setItem("authToken", token);
    setIsAuthenticated(true);
  };

  // ✅ Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setIsAuthenticated(false);
  };

  // ✅ Show Splash first
  if (showSplash) return <SplashScreen />;

  return (
    <Router>
      <AppRoutes
        isAuthenticated={isAuthenticated}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
    </Router>
  );
}

// ✅ Routes logic
function AppRoutes({ isAuthenticated, onLogin, onLogout }) {
  const navigate = useNavigate();

  // ✅ Redirect if trying to access /login or /register when already logged in
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (isAuthenticated && (currentPath === "/login" || currentPath === "/register")) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <Routes>
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
            path="/"
            element={
              <>
                <Navbar onLogout={onLogout} />
                <Home />
              </>
            }
          />
          <Route
            path="/map"
            element={
              <>
                <Navbar onLogout={onLogout} />
                <Map />
              </>
            }
          />
          <Route
            path="/chat"
            element={
              <>
                <Navbar onLogout={onLogout} />
                <Chat />
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
        </>
      )}

      {/* ========= FALLBACK ROUTE ========= */}
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
