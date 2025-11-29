import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff, CheckCircle } from "lucide-react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import "./Auth.css";
import logo from "../assets/logo.jpg";

const Register = ({ onLogin, showNotification }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password should be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Update profile with display name
      await updateProfile(userCredential.user, {
        displayName: formData.name
      });

      // ✅ STORE USER NAME IN LOCALSTORAGE AND SESSIONSTORAGE
      const userData = {
        name: formData.name,
        email: formData.email,
        displayName: formData.name,
        uid: userCredential.user.uid
      };

      // Store in multiple locations for better compatibility
      localStorage.setItem('currentUser', JSON.stringify(userData));
      localStorage.setItem('userName', formData.name);
      sessionStorage.setItem('userName', formData.name);
      sessionStorage.setItem('currentUser', JSON.stringify(userData));

      console.log('User data stored:', userData);
      console.log('Name stored:', formData.name);

      // Show success state
      setSuccess(true);
      
      // Show success notification
      if (showNotification) {
        showNotification("🎉 Account created successfully! Redirecting to login...", "success");
      }

      // Redirect to login page after successful registration
      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (error) {
      console.error("Registration error:", error);
      
      switch (error.code) {
        case "auth/email-already-in-use":
          setError("This email is already registered. Please use a different email or login.");
          break;
        case "auth/invalid-email":
          setError("Invalid email address.");
          break;
        case "auth/weak-password":
          setError("Password is too weak. Please use a stronger password.");
          break;
        case "auth/network-request-failed":
          setError("Network error. Please check your connection and try again.");
          break;
        default:
          setError("Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="success-screen">
            <div className="success-icon">
              <CheckCircle size={64} />
            </div>
            <div className="auth-header">
              <h1 className="auth-title">Welcome to PasaBUY! 🎉</h1>
              <p className="auth-subtitle">Your account has been created successfully</p>
            </div>
            
            <div className="success-message">
              <p>Hello <strong>{formData.name}</strong>!</p>
              <p>You'll be redirected to login shortly...</p>
            </div>

            <div className="loading-bar">
              <div className="loading-progress"></div>
            </div>

            <div className="auth-footer">
              <p>
                Not redirected?{" "}
                <Link to="/login" className="auth-link">
                  Click here to login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <Link to="/login" className="tab">
            Login
          </Link>
          <Link to="/register" className="tab tab-active">
            Register
          </Link>
        </div>

        <div className="card">
          {error && (
            <div className="error-message mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password (min. 6 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-10 pr-10"
                  required
                  minLength="6"
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

            <div className="input-group">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showConfirm ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-field pl-10 pr-10"
                  required
                  minLength="6"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  disabled={loading}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary mb-4"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="text-center mt-4">
            <Link to="/login" className="btn btn-guest">
              Already have an account? Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;