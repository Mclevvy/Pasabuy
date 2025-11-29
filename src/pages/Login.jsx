import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { signInWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { auth } from "../firebase";
import "./Auth.css";
import logo from "../assets/logo.jpg";

const Login = ({ onLogin, showNotification }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ 
    email: "", 
    password: "" 
  });
  
  const navigate = useNavigate();
  const location = useLocation();

  // Check for registration success message from navigation state
  React.useEffect(() => {
    if (location.state?.fromRegister) {
      if (showNotification) {
        showNotification("Registration successful! Please login to continue.", "success");
      }
      // Clear the state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate, showNotification]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Sign in with email and password using Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Get the user and token
      const user = userCredential.user;
      const token = await user.getIdToken();
      
      // Call your onLogin callback with the token
      onLogin(token);
      
      // Show success message
      if (showNotification) {
        showNotification(`Welcome back, ${user.displayName || user.email}!`, "success");
      }

      // Redirect to dashboard or home page
      navigate("/dashboard");

    } catch (error) {
      console.error("Login error:", error);
      
      // Handle specific Firebase errors
      switch (error.code) {
        case "auth/invalid-email":
          setError("Invalid email address.");
          break;
        case "auth/user-disabled":
          setError("This account has been disabled.");
          break;
        case "auth/user-not-found":
          setError("No account found with this email.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password.");
          break;
        case "auth/network-request-failed":
          setError("Network error. Please check your connection.");
          break;
        case "auth/too-many-requests":
          setError("Too many failed attempts. Please try again later.");
          break;
        default:
          setError("Failed to login. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError("");

    try {
      // Sign in anonymously using Firebase
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      const token = await user.getIdToken();
      
      // Call your onLogin callback with the token
      onLogin(token);
      
      // Show success message
      if (showNotification) {
        showNotification("Welcome Guest! Enjoy browsing PasaBUY.", "success");
      }

      // Redirect to dashboard or home page
      navigate("/dashboard");

    } catch (error) {
      console.error("Guest login error:", error);
      setError("Failed to login as guest. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // You can implement Google login later
    if (showNotification) {
      showNotification("Google login coming soon!", "info");
    }
  };

  const goToRegister = () => {
    navigate("/register");
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="logo-container">
            <img src={logo} alt="PasaBUY Logo" className="logo-image" />
          </div>
          <h1 className="auth-title">PasaBUY</h1>
          <p className="auth-subtitle">Shared buying made simple</p>
        </div>

        <div className="tab-container">
          <button className="tab tab-active">Login</button>
          <button className="tab" onClick={goToRegister}>
            Register
          </button>
        </div>

        <div className="card">
          {/* Error Message */}
          {error && (
            <div className="error-message mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label className="input-label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-10 pr-10"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary mb-4"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
          <div className="flex flex-col gap-3">

            <button
              type="button"
              onClick={handleGuestLogin}
              className="btn btn-guest"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Continue as Guest"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;