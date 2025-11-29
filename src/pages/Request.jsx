import React, { useState, useRef, useEffect } from "react";
import { FiArrowLeft, FiCamera, FiX, FiMapPin } from "react-icons/fi";
import { FaLocationArrow } from "react-icons/fa";
import "./Request.css";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase"; // UPDATED IMPORT PATH

const Request = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  
  const [formData, setFormData] = useState({
    itemName: "",
    quantity: 1,
    priceRange: "",
    storeLocation: "",
    pickupDate: "",
    notes: "",
    image: null,
    imagePreview: null,
  });

  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [userPhoto, setUserPhoto] = useState("");
  
  // Geolocation and Map state
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

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
      // Load Leaflet script dynamically
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
  }, [showMap, mapLoaded]);

  // Initialize map function
  const initializeMap = () => {
    if (!window.L || !mapRef.current) return;

    // Destroy existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const center = selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : [13.4144, 121.1795];
    
    // Create new map
    const map = window.L.map(mapRef.current).setView(center, 13);

    // Add tile layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add click event to map
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      console.log("Map clicked at:", lat, lng);
      
      try {
        const address = await getAddressFromCoordinates(lat, lng);
        setSelectedLocation({ lat, lng, address });
        setFormData(prev => ({
          ...prev,
          storeLocation: address
        }));

        // Update marker
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }
        
        markerRef.current = window.L.marker([lat, lng])
          .addTo(map)
          .bindPopup(`<strong>Selected Location:</strong><br/>${address}`)
          .openPopup();

      } catch (error) {
        console.error("Error getting address:", error);
        const fallbackAddress = `Location near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setSelectedLocation({ lat, lng, address: fallbackAddress });
        setFormData(prev => ({
          ...prev,
          storeLocation: fallbackAddress
        }));

        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }
        
        markerRef.current = window.L.marker([lat, lng])
          .addTo(map)
          .bindPopup(`<strong>Selected Location:</strong><br/>${fallbackAddress}`)
          .openPopup();
      }
    });

    // Add marker if there's a selected location
    if (selectedLocation) {
      markerRef.current = window.L.marker([selectedLocation.lat, selectedLocation.lng])
        .addTo(map)
        .bindPopup(`<strong>Selected Location:</strong><br/>${selectedLocation.address}`)
        .openPopup();
    }

    mapInstanceRef.current = map;
  };

  // Get current user data
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userData = {
            name: currentUser.displayName || "User",
            uid: currentUser.uid,
            email: currentUser.email,
            photoURL: currentUser.photoURL || ""
          };
          setUserName(userData.name);
          setUserId(userData.uid);
          setUserEmail(userData.email);
          setUserPhoto(userData.photoURL);
          localStorage.setItem("currentUser", JSON.stringify(userData));
          
          // Create user profile in Firestore if it doesn't exist
          await createUserProfile(userData);
          
          return userData;
        }

        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData.name && userData.uid) {
              setUserName(userData.name);
              setUserId(userData.uid);
              setUserEmail(userData.email || "");
              setUserPhoto(userData.photoURL || "");
              return userData;
            }
          } catch (parseError) {
            localStorage.removeItem("currentUser");
          }
        }

        alert("Please log in to create a request.");
        navigate("/login");
        return null;

      } catch (error) {
        alert("Please log in to create a request.");
        navigate("/login");
        return null;
      }
    };

    getCurrentUser();
  }, [navigate]);

  // Function to create user profile in Firestore
  const createUserProfile = async (userData) => {
    try {
      const userRef = doc(db, "users", userData.uid);
      await setDoc(userRef, {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.name,
        photoURL: userData.photoURL,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      }, { merge: true }); // Use merge to update existing or create new
      
      console.log("✅ User profile created/updated in Firestore");
    } catch (error) {
      console.error("❌ Error creating user profile:", error);
    }
  };

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

  // Function to get current location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsGettingLocation(true);
    
    const locationText = document.querySelector('.location-text-btn');
    if (locationText) {
      locationText.textContent = "🔄 Getting your location...";
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          console.log("User coordinates:", latitude, longitude);
          
          // Show map
          setShowMap(true);
          
          const address = await getAddressFromCoordinates(latitude, longitude);
          
          setUserLocation({
            latitude,
            longitude,
            address
          });

          setSelectedLocation({
            lat: latitude,
            lng: longitude,
            address
          });

          setFormData((prev) => ({
            ...prev,
            storeLocation: address,
          }));
          
          setShowSuggestions(false);
          
          if (locationText) {
            locationText.textContent = "📍 Location detected!";
            setTimeout(() => {
              locationText.textContent = "📍 Use my current location";
            }, 2000);
          }
          
          // Reinitialize map with new location
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([latitude, longitude], 15);
              
              // Update marker
              if (markerRef.current) {
                mapInstanceRef.current.removeLayer(markerRef.current);
              }
              
              markerRef.current = window.L.marker([latitude, longitude])
                .addTo(mapInstanceRef.current)
                .bindPopup(`<strong>Your Location:</strong><br/>${address}`)
                .openPopup();
            }
          }, 500);
          
        } catch (error) {
          console.error("Error getting address:", error);
          const fallbackLocation = `Near ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
          
          setFormData((prev) => ({
            ...prev,
            storeLocation: fallbackLocation,
          }));
          
          if (locationText) {
            locationText.textContent = "📍 Location detected (approximate)";
            setTimeout(() => {
              locationText.textContent = "📍 Use my current location";
            }, 2000);
          }
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsGettingLocation(false);
        
        const locationText = document.querySelector('.location-text-btn');
        if (locationText) {
          locationText.textContent = "📍 Unable to get location";
          setTimeout(() => {
            locationText.textContent = "📍 Use my current location";
          }, 3000);
        }
        
        alert("Unable to get your current location. Please select from the list or enable location permissions.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  };

  // Function to get address from coordinates
  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      
      if (data && data.address) {
        const { road, suburb, city, town, village, municipality, state, country } = data.address;
        
        const addressParts = [];
        if (road) addressParts.push(road);
        if (suburb) addressParts.push(suburb);
        if (town || city || municipality) addressParts.push(town || city || municipality);
        if (state) addressParts.push(state);
        if (country) addressParts.push(country);
        
        return addressParts.join(', ');
      }
      
      return `Location near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `Location near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const calculateFees = () => {
    try {
      const priceString = formData.priceRange.replace(/[^0-9]/g, "");
      const price = parseFloat(priceString) || 0;
      const serviceFee = Math.max(50, price * 0.05);
      const platformFee = Math.max(25, price * 0.02);
      const totalFees = serviceFee + platformFee;
      
      return {
        serviceFee: Math.round(serviceFee),
        platformFee: Math.round(platformFee),
        totalFees: Math.round(totalFees),
        estimatedTotal: Math.round(price + totalFees)
      };
    } catch (error) {
      console.error("Error calculating fees:", error);
      return {
        serviceFee: 0,
        platformFee: 0,
        totalFees: 0,
        estimatedTotal: 0
      };
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "storeLocation") {
      if (value.length > 1) {
        const filtered = locations.filter(location =>
          location.name.toLowerCase().includes(value.toLowerCase())
        );
        setLocationSuggestions(filtered);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }
  };

  const handleLocationSelect = (location) => {
    setFormData((prev) => ({
      ...prev,
      storeLocation: location.name,
    }));
    
    // Update map to show selected location
    setSelectedLocation({
      lat: location.lat,
      lng: location.lng,
      address: location.name
    });
    setShowMap(true);
    setShowSuggestions(false);

    // Update map view if map is already initialized
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([location.lat, location.lng], 15);
        
        if (markerRef.current) {
          mapInstanceRef.current.removeLayer(markerRef.current);
        }
        
        markerRef.current = window.L.marker([location.lat, location.lng])
          .addTo(mapInstanceRef.current)
          .bindPopup(`<strong>Selected Location:</strong><br/>${location.name}`)
          .openPopup();
      }
    }, 500);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size too large! Please select an image under 5MB.");
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert("Please select a valid image file (JPG, PNG, etc.)");
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        image: file,
        imagePreview: previewUrl,
      }));
    }
  };

  const removeImage = () => {
    if (formData.imagePreview) {
      URL.revokeObjectURL(formData.imagePreview);
    }
    setFormData((prev) => ({
      ...prev,
      image: null,
      imagePreview: null,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePriceChange = (e) => {
    let value = e.target.value.replace(/[^0-9]/g, "");
    if (value) {
      value = "₱ " + parseInt(value).toLocaleString();
    }
    setFormData((prev) => ({
      ...prev,
      priceRange: value,
    }));
  };

  const toggleMap = () => {
    setShowMap(!showMap);
  };

  // UPDATED SUBMIT FUNCTION FOR USER-SPECIFIC COLLECTIONS
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (!userId) {
      alert("Please log in to create a request.");
      setLoading(false);
      navigate("/login");
      return;
    }

    if (!formData.itemName.trim()) {
      alert("Please enter an item name.");
      setLoading(false);
      return;
    }

    if (!formData.storeLocation.trim()) {
      alert("Please select a store location.");
      setLoading(false);
      return;
    }

    if (!formData.pickupDate) {
      alert("Please select a pickup date and time.");
      setLoading(false);
      return;
    }

    try {
      const priceString = formData.priceRange.replace(/[^0-9]/g, "");
      const price = parseFloat(priceString) || 0;
      const fees = calculateFees();
      const totalAmount = price + fees.totalFees;

      const requestData = {
        title: formData.itemName.trim(),
        user: userName,
        userEmail: userEmail,
        userId: userId,
        userPhoto: userPhoto,
        status: "Active",
        location: formData.storeLocation.trim(),
        price: totalAmount,
        note: formData.notes.trim(),
        items: [`${formData.itemName.trim()} (Qty: ${formData.quantity})`],
        quantity: formData.quantity,
        storeLocation: formData.storeLocation.trim(),
        pickupDate: formData.pickupDate,
        imageUrl: formData.imagePreview || null,
        userLocation: selectedLocation ? {
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng
        } : (userLocation ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        } : null),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // UPDATED: Store in user-specific collection instead of global "requests"
      const userRequestsRef = collection(db, "users", userId, "requests");
      const docRef = await addDoc(userRequestsRef, requestData);
      
      console.log("✅ Request created with ID: ", docRef.id, "in user-specific collection");

      setFormData({
        itemName: "",
        quantity: 1,
        priceRange: "",
        storeLocation: "",
        pickupDate: "",
        notes: "",
        image: null,
        imagePreview: null,
      });

      alert(`✅ Request posted successfully!\n\n📍 Pickup Location: ${formData.storeLocation}\nTotal Amount: ₱${totalAmount.toLocaleString()}`);
      
      navigate("/");

    } catch (error) {
      console.error("❌ Error creating request:", error);
      alert("Failed to create request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fees = calculateFees();

  return (
    <div className="request-container">
      <header className="request-header">
        <button className="back-btn" onClick={() => navigate("/")} disabled={loading}>
          <FiArrowLeft className="back-icon" />
        </button>
        <div className="header-text">
          <h2>Request an item</h2>
          <p>Tell us what you need - Oriental Mindoro Locations</p>
        </div>
      </header>

      <div className="form-wrapper">
        <form className="request-form" onSubmit={handleSubmit}>
          <h3>Item Details</h3>

          <div className="form-group">
            <label>Item Name *</label>
            <input
              type="text"
              name="itemName"
              placeholder="e.g. iPhone 15 Pro Max, Groceries, etc."
              value={formData.itemName}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Quantity</label>
              <input
                type="number"
                name="quantity"
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Price Range *</label>
              <input
                type="text"
                name="priceRange"
                placeholder="₱ 50,000"
                value={formData.priceRange}
                onChange={handlePriceChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Store Location in Oriental Mindoro *</label>
            <div className="input-with-suggestions">
              <div className="input-icon">
                <FiMapPin className="icon" />
                <input
                  type="text"
                  name="storeLocation"
                  placeholder="e.g. SM City Calapan, Puerto Galera Market, etc."
                  value={formData.storeLocation}
                  onChange={handleChange}
                  required
                  disabled={loading || isGettingLocation}
                />
                {isGettingLocation && (
                  <div className="location-loading">
                    <div className="loading-spinner"></div>
                  </div>
                )}
              </div>
              {showSuggestions && locationSuggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  <div className="suggestions-header">
                    📍 Locations in Oriental Mindoro
                  </div>
                  {locationSuggestions.map((location, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      onClick={() => !loading && handleLocationSelect(location)}
                    >
                      📍 {location.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="location-buttons">
              <button
                type="button"
                className="location-text-btn"
                onClick={!loading ? handleUseCurrentLocation : undefined}
                disabled={loading || isGettingLocation}
              >
                <FaLocationArrow className="location-icon" />
                {isGettingLocation ? "🔄 Getting your location..." : "📍 Use my current location"}
              </button>
              
              <button
                type="button"
                className="map-toggle-btn"
                onClick={toggleMap}
                disabled={loading}
              >
                {showMap ? "🗺️ Hide Map" : "🗺️ Show Map"}
              </button>
            </div>

            {userLocation && (
              <p className="location-coordinates">
                📍 Your location: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </p>
            )}

            {showMap && (
              <div className="map-container">
                <div className="map-instructions">
                  <p>📍 Click on the map to select your exact pickup location</p>
                </div>
                <div 
                  ref={mapRef} 
                  style={{ height: '300px', width: '100%', borderRadius: '8px' }}
                  className="leaflet-map"
                />
                {selectedLocation && (
                  <div className="selected-location-info">
                    <p><strong>Selected Location:</strong> {selectedLocation.address}</p>
                    <p><strong>Coordinates:</strong> {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Preferred Pickup Time *</label>
            <input
              type="datetime-local"
              name="pickupDate"
              value={formData.pickupDate}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Additional Notes (Optional)</label>
            <textarea
              name="notes"
              placeholder="Any specific requirements or preferences for your item..."
              value={formData.notes}
              onChange={handleChange}
              disabled={loading}
            ></textarea>
          </div>

          <div className="form-group">
            <label>Add Photos (Optional)</label>
            <div className="upload-box">
              <input
                type="file"
                id="fileUpload"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                disabled={loading}
              />
              
              {formData.imagePreview ? (
                <div className="image-preview-container">
                  <div className="image-preview">
                    <img src={formData.imagePreview} alt="Preview" />
                    <button 
                      type="button" 
                      className="remove-image-btn"
                      onClick={removeImage}
                      disabled={loading}
                    >
                      <FiX />
                    </button>
                  </div>
                  <p className="file-name">📷 {formData.image.name}</p>
                </div>
              ) : (
                <label htmlFor="fileUpload" className="upload-label">
                  <FiCamera className="camera-icon" />
                  <p>
                    Upload product images
                    <br />
                    <span>JPG, PNG up to 5MB</span>
                  </p>
                </label>
              )}
            </div>
          </div>

          <div className="summary-box">
            <h4>Request Summary</h4>
            <div className="summary-item">
              <span>Item Price</span>
              <span>{formData.priceRange || "₱ 0"}</span>
            </div>
            <div className="summary-item">
              <span>Service Fee (5% min ₱50)</span>
              <span>₱{fees.serviceFee}</span>
            </div>
            <div className="summary-item">
              <span>Platform Fee (2% min ₱25)</span>
              <span>₱{fees.platformFee}</span>
            </div>
            <div className="summary-item total">
              <span>Total Fees</span>
              <span>₱{fees.totalFees}</span>
            </div>
            <div className="summary-item grand-total">
              <span>Estimated Total</span>
              <span>₱{fees.estimatedTotal}</span>
            </div>
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? "Posting Request..." : `Post Request - ₱${fees.estimatedTotal}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Request;