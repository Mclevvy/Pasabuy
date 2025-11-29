import React, { useEffect, useState, useRef } from "react";
import { FaBox, FaCarSide, FaBell, FaClock, FaMapPin, FaUser, FaStore, FaMoneyBillWave, FaStickyNote, FaEdit, FaTrash } from "react-icons/fa";
import { FiArrowLeft, FiMapPin, FiX, FiCalendar, FiPackage } from "react-icons/fi";
import { FaRobot } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  getDocs
} from "firebase/firestore";
import { auth, db } from "../firebase"; // UPDATED IMPORT PATH
import { onAuthStateChanged } from "firebase/auth";
import BottomNav from "../components/BottomNav";
import EditReq from "./EditReq";
import "./Home.css";
import logo from "../assets/logo.jpg";

const Home = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [userProfilePic, setUserProfilePic] = useState("https://cdn-icons-png.flaticon.com/512/219/219983.png");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  
  // Map state for request details
  const [showMap, setShowMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [showAllRequests, setShowAllRequests] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Oriental Mindoro location data with coordinates
  const locations = [
    { name: "SM City Calapan", lat: 13.4144, lng: 121.1795 },
    { name: "Robinsons Place Calapan", lat: 13.4098, lng: 121.1823 },
    { name: "Puregold Calapan", lat: 13.4120, lng: 121.1800 },
    { name: "Walter Mart Calapan", lat: 13.4085, lng: 121.1850 },
    { name: "Calapan Public Market", lat: 13.4115, lng: 121.1810 },
    { name: "Bayanan Public Market", lat: 13.4060, lng: 121.1780 },
    { name: "Puerto Galera Town Proper", lat: 13.5024, lng: 120.9543 },
    { name: "Puerto Galera Public Market", lat: 13.5010, lng: 120.9535 },
    { name: "Roxas Public Market", lat: 12.5872, lng: 121.5200 },
    { name: "Mansalay Town Center", lat: 12.5200, lng: 121.4380 },
    { name: "Bulalacao Public Market", lat: 12.3250, lng: 121.3430 },
    { name: "Baco Public Market", lat: 13.3580, lng: 121.0980 },
    { name: "Naujan Public Market", lat: 13.3235, lng: 121.3030 },
    { name: "Victoria Public Market", lat: 13.1772, lng: 121.2750 },
    { name: "Socorro Public Market", lat: 13.0580, lng: 121.4110 },
    { name: "Pinamalayan Public Market", lat: 13.0390, lng: 121.4850 },
    { name: "Gloria Public Market", lat: 12.9830, lng: 121.4770 },
    { name: "Bongabong Public Market", lat: 12.7470, lng: 121.4870 },
    { name: "San Teodoro Public Market", lat: 13.4370, lng: 121.0210 },
    { name: "Bansud Public Market", lat: 12.8650, lng: 121.4570 }
  ];

  // Load Leaflet CSS dynamically
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
    link.integrity = 'sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A==';
    link.crossOrigin = '';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Initialize map when showMap becomes true
  useEffect(() => {
    if (showMap && !mapLoaded) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js';
      script.integrity = 'sha512-XQoYMqMTK8LvdxXYG3nZ448hOEQiglfqkJs1NOQV44cWnUrBc8PkAOcXy20w0vlaXaVUearIOBhiXZ5V3ynxwA==';
      script.crossOrigin = '';
      script.onload = () => {
        setMapLoaded(true);
        initializeMap();
      };
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    } else if (showMap && mapLoaded && mapRef.current) {
      initializeMap();
    }
  }, [showMap, mapLoaded, selectedRequest]);

  // Initialize map function for request details
  const initializeMap = () => {
    if (!window.L || !mapRef.current || !selectedRequest) return;

    // Destroy existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    // Get coordinates from request
    let center = [13.4144, 121.1795]; // Default: Calapan City
    let zoom = 13;

    // Check if request has userLocation coordinates
    if (selectedRequest.userLocation) {
      center = [selectedRequest.userLocation.latitude, selectedRequest.userLocation.longitude];
      zoom = 15;
    } else {
      // Try to find location in our predefined list
      const foundLocation = locations.find(loc => 
        loc.name === selectedRequest.storeLocation || 
        loc.name === selectedRequest.location
      );
      if (foundLocation) {
        center = [foundLocation.lat, foundLocation.lng];
        zoom = 15;
      }
    }

    // Create new map
    const map = window.L.map(mapRef.current).setView(center, zoom);

    // Add tile layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add marker for the request location
    if (selectedRequest.userLocation) {
      markerRef.current = window.L.marker([
        selectedRequest.userLocation.latitude, 
        selectedRequest.userLocation.longitude
      ])
        .addTo(map)
        .bindPopup(`
          <strong>${selectedRequest.title}</strong><br/>
          <em>${selectedRequest.storeLocation || selectedRequest.location}</em><br/>
          ₱${selectedRequest.price?.toLocaleString() || '0'}
        `)
        .openPopup();
    } else {
      // Add marker for predefined location
      const foundLocation = locations.find(loc => 
        loc.name === selectedRequest.storeLocation || 
        loc.name === selectedRequest.location
      );
      if (foundLocation) {
        markerRef.current = window.L.marker([foundLocation.lat, foundLocation.lng])
          .addTo(map)
          .bindPopup(`
            <strong>${selectedRequest.title}</strong><br/>
            <em>${foundLocation.name}</em><br/>
            ₱${selectedRequest.price?.toLocaleString() || '0'}
          `)
          .openPopup();
      }
    }

    mapInstanceRef.current = map;
  };

  // Data recovery on component mount
  useEffect(() => {
    const recoverData = async () => {
      if (userId && requests.length === 0 && !loading) {
        console.log("🔄 Attempting data recovery...");
        await fetchUserRequests(userId);
      }
    };

    recoverData();
  }, [userId, requests.length, loading]);

  // Toggle map visibility
  const toggleMap = () => {
    setShowMap(!showMap);
  };

  // Close modals
  const closeModal = () => {
    setSelectedRequest(null);
    setEditingRequest(null);
    setShowMap(false);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setRequestToDelete(null);
  };

  const closeEditModal = () => {
    setEditingRequest(null);
  };

  // Close all modals
  const closeAllModals = () => {
    closeModal();
    closeDeleteConfirm();
    closeEditModal();
  };

  // Function to update user name in all requests
  const updateUserNameInRequests = async (userId, newName) => {
    try {
      console.log("🔄 Updating user name in all requests...");
      
      // Update in Firebase - NOW USING USER-SPECIFIC COLLECTIONS
      const userRequestsRef = collection(db, "users", userId, "requests");
      const querySnapshot = await getDocs(userRequestsRef);
      
      const updatePromises = [];
      querySnapshot.forEach((docSnapshot) => {
        const requestRef = doc(db, "users", userId, "requests", docSnapshot.id);
        updatePromises.push(updateDoc(requestRef, { user: newName }));
      });
      
      await Promise.all(updatePromises);
      console.log("✅ User name updated in all requests in Firebase");
      
      // Update local state
      setRequests(prevRequests => 
        prevRequests.map(request => 
          request.userId === userId 
            ? { ...request, user: newName }
            : request
        )
      );
      
      // Update localStorage cache
      const updatedRequests = requests.map(request => 
        request.userId === userId 
          ? { ...request, user: newName }
          : request
      );
      localStorage.setItem(`userRequests_${userId}`, JSON.stringify(updatedRequests));
      
    } catch (error) {
      console.error("❌ Error updating user name in requests:", error);
    }
  };

  // Get current user data - Enhanced version
  useEffect(() => {
    console.log("🔄 Starting authentication check...");
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("📝 Auth state changed:", currentUser);
      
      try {
        if (currentUser) {
          // User is signed in
          console.log("✅ User authenticated:", currentUser.uid);
          
          const userData = {
            name: currentUser.displayName || "User",
            uid: currentUser.uid,
            email: currentUser.email,
            photoURL: currentUser.photoURL
          };
          
          setUserName(userData.name);
          setUserId(userData.uid);
          if (currentUser.photoURL) {
            setUserProfilePic(currentUser.photoURL);
          }
          
          // Save to localStorage for persistence
          localStorage.setItem("currentUser", JSON.stringify(userData));
          
          // Fetch user requests immediately
          await fetchUserRequests(currentUser.uid);
          
        } else {
          // User is signed out, check localStorage
          console.log("🔍 No authenticated user, checking localStorage...");
          const storedUser = localStorage.getItem("currentUser");
          
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              console.log("📦 User found in localStorage:", userData);
              
              if (userData.uid) {
                setUserName(userData.name || "User");
                setUserId(userData.uid);
                if (userData.photoURL) {
                  setUserProfilePic(userData.photoURL);
                }
                
                // Fetch user requests from localStorage user
                await fetchUserRequests(userData.uid);
              } else {
                throw new Error("Invalid user data");
              }
            } catch (parseError) {
              console.error("❌ Error parsing stored user:", parseError);
              localStorage.removeItem("currentUser");
              setLoading(false);
            }
          } else {
            // No user at all
            console.log("❌ No user found");
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("❌ Error in auth state change:", error);
        setLoading(false);
      } finally {
        setAuthChecked(true);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Listen for profile updates from localStorage (when profile is updated)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "currentUser" && e.newValue) {
        try {
          const updatedUser = JSON.parse(e.newValue);
          console.log("🔄 Profile update detected:", updatedUser);
          
          if (updatedUser.uid === userId && updatedUser.name !== userName) {
            console.log("🔄 Updating user name from profile change:", updatedUser.name);
            setUserName(updatedUser.name);
            
            // Update user name in all requests
            if (userId) {
              updateUserNameInRequests(userId, updatedUser.name);
            }
          }
          
          if (updatedUser.photoURL && updatedUser.photoURL !== userProfilePic) {
            setUserProfilePic(updatedUser.photoURL);
          }
        } catch (error) {
          console.error("Error parsing updated user data:", error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check for profile updates within the same tab
    const checkProfileUpdate = setInterval(() => {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        try {
          const currentStoredUser = JSON.parse(storedUser);
          if (currentStoredUser.uid === userId && currentStoredUser.name !== userName) {
            console.log("🔄 Profile update detected (same tab):", currentStoredUser.name);
            setUserName(currentStoredUser.name);
            
            // Update user name in all requests
            if (userId) {
              updateUserNameInRequests(userId, currentStoredUser.name);
            }
          }
        } catch (error) {
          console.error("Error checking profile update:", error);
        }
      }
    }, 2000); // Check every 2 seconds

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkProfileUpdate);
    };
  }, [userId, userName, userProfilePic]);

  // ENHANCED FUNCTION TO FETCH USER REQUESTS FROM USER-SPECIFIC COLLECTIONS
  const fetchUserRequests = async (uid) => {
    if (!uid) {
      console.log("❌ No user ID provided for fetching requests");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("📥 Fetching requests for user:", uid);
      
      // First, try to get from localStorage for immediate display
      const cachedRequests = localStorage.getItem(`userRequests_${uid}`);
      if (cachedRequests) {
        try {
          const parsedRequests = JSON.parse(cachedRequests);
          console.log("📦 Using cached requests for immediate display");
          setRequests(parsedRequests);
        } catch (cacheError) {
          console.error("Error parsing cached requests:", cacheError);
        }
      }

      // Then fetch from Firebase - USING USER-SPECIFIC COLLECTIONS
      const userRequestsRef = collection(db, "users", uid, "requests");
      const q = query(userRequestsRef, orderBy("createdAt", "desc"));

      const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
          const requestsData = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Convert Firestore timestamp to Date object
            const createdAt = data.createdAt?.toDate?.() || new Date();
            
            requestsData.push({
              id: doc.id,
              ...data,
              createdAt: createdAt,
              time: formatTimeAgo(createdAt)
            });
          });
          
          console.log("✅ Fetched requests from Firebase (user-specific):", requestsData.length, "requests");
          
          // Update state
          setRequests(requestsData);
          
          // Update localStorage cache
          localStorage.setItem(`userRequests_${uid}`, JSON.stringify(requestsData));
          
          setLoading(false);
        },
        (error) => {
          console.error("❌ Error in onSnapshot:", error);
          console.error("Error details:", error.message);
          
          // If Firebase fails, use cached data if available
          const cachedRequests = localStorage.getItem(`userRequests_${uid}`);
          if (cachedRequests) {
            try {
              const parsedRequests = JSON.parse(cachedRequests);
              console.log("🔄 Falling back to cached requests due to Firebase error");
              setRequests(parsedRequests);
            } catch (parseError) {
              console.error("Error parsing cached requests:", parseError);
            }
          }
          
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("❌ Error setting up requests listener:", error);
      
      // Final fallback to localStorage
      const cachedRequests = localStorage.getItem(`userRequests_${uid}`);
      if (cachedRequests) {
        try {
          const parsedRequests = JSON.parse(cachedRequests);
          console.log("🔄 Using cached requests as final fallback");
          setRequests(parsedRequests);
        } catch (parseError) {
          console.error("Error parsing cached requests:", parseError);
        }
      }
      
      setLoading(false);
    }
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Enhanced image error handling
  const handleImageError = (e) => {
    e.target.style.display = 'none';
    console.log("Image failed to load, hiding image element");
  };

  // Handle edit button click
  const handleEditRequest = (request) => {
    console.log("Editing request:", request);
    setEditingRequest(request);
    setSelectedRequest(null);
  };

  // Handle update from EditReq component
  const handleRequestUpdate = (requestId, updateData) => {
    // Update local state
    const updatedRequests = requests.map(req => 
      req.id === requestId 
        ? { ...req, ...updateData }
        : req
    );
    setRequests(updatedRequests);
    
    // Update localStorage cache
    if (userId) {
      localStorage.setItem(`userRequests_${userId}`, JSON.stringify(updatedRequests));
    }
  };

  // ENHANCED DELETE FUNCTION FOR USER-SPECIFIC COLLECTIONS
  const handleDeleteRequest = async () => {
    if (!requestToDelete || !userId) return;

    setLoading(true);
    console.log("Deleting request:", requestToDelete.id);
    
    try {
      // Delete from user-specific collection
      const requestRef = doc(db, "users", userId, "requests", requestToDelete.id);
      await deleteDoc(requestRef);

      alert("🗑️ Request deleted successfully!");
      
      // Update local state
      const updatedRequests = requests.filter(req => req.id !== requestToDelete.id);
      setRequests(updatedRequests);
      
      // Update localStorage cache
      localStorage.setItem(`userRequests_${userId}`, JSON.stringify(updatedRequests));
      
      closeDeleteConfirm();
      
      if (selectedRequest && selectedRequest.id === requestToDelete.id) {
        closeModal();
      }

    } catch (error) {
      console.error("Error deleting request:", error);
      console.error("Error details:", error.message);
      alert("Failed to delete request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show delete confirmation
  const showDeleteConfirmation = (request) => {
    setRequestToDelete(request);
    setShowDeleteConfirm(true);
  };

  // Handle View All toggle
  const handleViewAllToggle = () => {
    setShowAllRequests(!showAllRequests);
  };

  // Handle notification area click
  const handleNotificationClick = () => {
    navigate("/notifications");
  };

  // Handle Request Item button click - REDIRECT TO REQUEST PAGE
  const handleRequestItemClick = () => {
    navigate("/request");
  };

  // Get displayed requests (all or limited)
  const displayedRequests = showAllRequests ? requests : requests.slice(0, 3);

  // Show loading only if we're still checking auth AND loading requests
  const showLoading = loading || !authChecked;

  return (
    <div className="home-container">
      {/* MOBILE HEADER */}
      <header className="mobile-header">
        <img src={logo} alt="Pasabuy Logo" className="mobile-logo" />
        <h1>Pasabuy</h1>
      </header>

      {/* MAIN CONTENT */}
      <main className="home-content">
        <header className="home-header clickable-notification-area" onClick={handleNotificationClick}>
          <div className="header-text">
            <p>Welcome back,</p>
            <h2>Hi, {userName}!</h2>
          </div>
          <div className="notification-badge-wrapper">
            <FaBell className="notif-icon" />
          </div>
        </header>

        {/* QUICK ACTIONS */}
        <section className="quick-actions">
          <button className="action-card" onClick={handleRequestItemClick}>
            <FaBox className="action-icon" />
            <p>Request Item</p>
          </button>
          <button className="action-card" onClick={() => navigate("/pasabuyer")}>
            <FaCarSide className="action-icon" />
            <p>Pasabuyer</p>
          </button>
          <button className="action-card" onClick={() => navigate("/chatbot")}>
            <FaRobot className="action-icon" />
            <p>Chatbot</p>
          </button>
        </section>

        {/* MODAL OVERLAY SYSTEM */}
        
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="modal-backdrop delete-confirm-backdrop">
            <div className="modal delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <header className="modal-header">
                <div className="header-text">
                  <h3>Delete Request</h3>
                  <p>Are you sure you want to delete this request?</p>
                </div>
                <button className="modal-close" onClick={closeDeleteConfirm} disabled={loading}>
                  <FiX />
                </button>
              </header>
              
              <div className="modal-body">
                <div className="delete-confirm-content">
                  <div className="warning-icon">
                    <FaTrash />
                  </div>
                  <h4>"{requestToDelete?.title}"</h4>
                  <p className="warning-text">
                    This action cannot be undone. The request will be permanently deleted.
                  </p>
                  
                  <div className="request-preview">
                    <div className="preview-item">
                      <span>Item:</span>
                      <span>{requestToDelete?.title}</span>
                    </div>
                    <div className="preview-item">
                      <span>Price:</span>
                      <span>₱{requestToDelete?.price?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="preview-item">
                      <span>Location:</span>
                      <span>{requestToDelete?.storeLocation || requestToDelete?.location}</span>
                    </div>
                    <div className="preview-item">
                      <span>Posted by:</span>
                      <span>{requestToDelete?.user}</span>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={closeDeleteConfirm}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn danger"
                      onClick={handleDeleteRequest}
                      disabled={loading}
                    >
                      {loading ? "Deleting..." : "Delete Request"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Request Modal */}
        {editingRequest && (
          <EditReq
            editingRequest={editingRequest}
            onClose={closeEditModal}
            onUpdate={handleRequestUpdate}
            locations={locations}
            userId={userId} // Pass userId for user-specific updates
          />
        )}

        {/* Request Details Modal with Map */}
        {selectedRequest && (
          <div className="modal-backdrop details-backdrop">
            <div className="modal request-details-modal" onClick={(e) => e.stopPropagation()}>
              <header className="modal-header">
                <button className="back-btn" onClick={closeModal}>
                  <FiArrowLeft />
                </button>
                <div className="header-text">
                  <h3>Request Details</h3>
                  <p>Complete information about your request</p>
                </div>
                <button className="modal-close" onClick={closeModal}>
                  <FiX />
                </button>
              </header>
              
              <div className="modal-body">
                <div className="request-details-content">
                  {/* Status Badge */}
                  <div className={`status-badge ${selectedRequest.status.toLowerCase()}`}>
                    {selectedRequest.status}
                  </div>

                  {/* Map Toggle Button - SMALLER */}
                  <div className="map-toggle-section">
                    <button
                      type="button"
                      className="map-toggle-btn"
                      onClick={toggleMap}
                    >
                      <FiMapPin className="location-icon" />
                      {showMap ? "Hide Map" : "Show Map"}
                    </button>
                  </div>

                  {/* Interactive Map */}
                  {showMap && (
                    <section className="detail-section">
                      <div className="section-header">
                        <FiMapPin className="section-icon" />
                        <h4>Location on Map</h4>
                      </div>
                      <div className="map-container">
                        <div className="map-instructions">
                          <p>📍 Request Location: {selectedRequest.storeLocation || selectedRequest.location}</p>
                        </div>
                        <div 
                          ref={mapRef} 
                          style={{ height: '200px', width: '100%', borderRadius: '8px' }}
                          className="leaflet-map"
                        />
                        {selectedRequest.userLocation && (
                          <div className="selected-location-info">
                            <p><strong>Coordinates:</strong> {selectedRequest.userLocation.latitude.toFixed(4)}, {selectedRequest.userLocation.longitude.toFixed(4)}</p>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Item Image */}
                  {selectedRequest.imageUrl && (
                    <section className="detail-section">
                      <div className="image-section">
                        <img 
                          src={selectedRequest.imageUrl} 
                          alt={selectedRequest.title}
                          className="request-image"
                          onError={handleImageError}
                        />
                      </div>
                    </section>
                  )}

                  {/* Item Information */}
                  <section className="detail-section">
                    <div className="section-header">
                      <FiPackage className="section-icon" />
                      <h4>Item Information</h4>
                    </div>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Item Name</span>
                        <span className="detail-value">{selectedRequest.title}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Quantity</span>
                        <span className="detail-value">{selectedRequest.quantity || 1}</span>
                      </div>
                    </div>
                  </section>

                  {/* Pricing */}
                  <section className="detail-section">
                    <div className="section-header">
                      <FaMoneyBillWave className="section-icon" />
                      <h4>Pricing</h4>
                    </div>
                    <div className="price-display">
                      <span className="price-amount">₱{selectedRequest.price?.toLocaleString() || '0'}</span>
                      <span className="price-label">Total Amount</span>
                    </div>
                  </section>

                  {/* Location & Store */}
                  <section className="detail-section">
                    <div className="section-header">
                      <FaStore className="section-icon" />
                      <h4>Location & Store</h4>
                    </div>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Store Location</span>
                        <span className="detail-value">
                          <FiMapPin className="inline-icon" />
                          {selectedRequest.storeLocation || selectedRequest.location}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Preferred Pickup</span>
                        <span className="detail-value">
                          <FiCalendar className="inline-icon" />
                          {formatDate(selectedRequest.pickupDate)}
                        </span>
                      </div>
                      {/* Coordinates Display */}
                      {selectedRequest.userLocation && (
                        <div className="detail-item">
                          <span className="detail-label">Coordinates</span>
                          <span className="detail-value">
                            {selectedRequest.userLocation.latitude.toFixed(4)}, {selectedRequest.userLocation.longitude.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Request Information */}
                  <section className="detail-section">
                    <div className="section-header">
                      <FaUser className="section-icon" />
                      <h4>Request Information</h4>
                    </div>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Requested By</span>
                        <span className="detail-value">{selectedRequest.user}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Date Created</span>
                        <span className="detail-value">
                          <FaClock className="inline-icon" />
                          {formatDate(selectedRequest.createdAt)}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Time Ago</span>
                        <span className="detail-value">{selectedRequest.time}</span>
                      </div>
                    </div>
                  </section>

                  {/* Additional Notes */}
                  {selectedRequest.note && (
                    <section className="detail-section">
                      <div className="section-header">
                        <FaStickyNote className="section-icon" />
                        <h4>Additional Notes</h4>
                      </div>
                      <div className="notes-content">
                        <p>{selectedRequest.note}</p>
                      </div>
                    </section>
                  )}

                  {/* Action Buttons */}
                  <div className="action-buttons">
                    <button 
                      className="btn warning"
                      onClick={() => showDeleteConfirmation(selectedRequest)}
                    >
                      <FaTrash className="btn-icon" />
                      Delete Request
                    </button>
                    <button 
                      className="btn primary"
                      onClick={() => handleEditRequest(selectedRequest)}
                    >
                      <FaEdit className="btn-icon" />
                      Edit Request
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RECENT REQUESTS */}
        <section className="recent-requests">
          <div className="section-header">
            <h4>My Recent Requests</h4>
            {requests.length > 3 && (
              <button 
                className={`view-all-btn ${showAllRequests ? 'active' : ''}`}
                onClick={handleViewAllToggle}
              >
                {showAllRequests ? 'Show Less' : `View All (${requests.length})`}
              </button>
            )}
          </div>

          {showLoading ? (
            <div className="loading-requests">
              <p>Loading your requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="no-requests">
              <p>No requests yet. Create your first request!</p>
            </div>
          ) : (
            <div className="requests-grid">
              {displayedRequests.map((req) => (
                <article className="request-card" key={req.id}>
                  <div className="request-card-body">
                    {req.imageUrl && (
                      <div className="request-image-preview">
                        <img 
                          src={req.imageUrl} 
                          alt={req.title} 
                          onError={handleImageError}
                        />
                      </div>
                    )}
                    <div className="user">
                      <img 
                        src={userProfilePic} 
                        alt="User" 
                        onError={(e) => {
                          e.target.src = "https://cdn-icons-png.flaticon.com/512/706/706830.png";
                        }}
                      />
                      <div className="user-info">
                        <h5>{req.title}</h5>
                        <p>by {req.user}</p>
                      </div>
                      <span className={`status ${req.status === "Active" ? "active" : "accepted"}`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="request-info">
                      <span className="info-item">
                        <FaMapPin /> {req.location}
                      </span>
                      <span className="info-item">
                        <FaClock /> {req.time}
                      </span>
                      {/* Location Coordinates if available */}
                      {req.userLocation && (
                        <span className="info-item coordinates">
                          📍 {req.userLocation.latitude.toFixed(2)}, {req.userLocation.longitude.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="request-footer">
                    <p className="price">₱{req.price?.toLocaleString() || '0'}</p>
                    <button
                      className="view-details-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedRequest(req);
                        setShowMap(false); // Reset map state when opening new request
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* SUMMARY */}
        <section className="activity-summary">
          <div className="activity-card">
            <div>
              <h3>{requests.length}</h3>
              <p>Requests</p>
            </div>
            <div className="divider" />
            <div>
              <h3>{requests.filter(req => req.status === "Accepted").length}</h3>
              <p>Completed</p>
            </div>
            <div className="divider" />
            <div>
              <h3>4.8</h3>
              <p>Rating</p>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;