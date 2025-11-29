import React, { useEffect, useMemo, useState } from "react";
import {
  FaUserEdit, FaCar, FaBell,
  FaSignOutAlt, FaCamera, FaTimes,
  FaPlus, FaEdit, FaTrash, FaMapMarkerAlt,
  FaVenusMars, FaCalendarAlt, FaUserTag,
  FaSpinner, FaPhone, FaEnvelope,
  FaBox, FaCheckCircle, FaRobot,
  FaHistory, FaListAlt
} from "react-icons/fa";
import BottomNav from "../components/BottomNav";
import { useNavigate } from "react-router-dom";
import { auth, storage, db } from "../firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, getDoc, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import "./Profile.css";

const Profile = ({ onLogout, onProfileUpdate }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    birthdate: "",
    gender: "",
    status: "",
    avatar: "https://cdn-icons-png.flaticon.com/512/219/219983.png",
    location: {
      latitude: null,
      longitude: null,
      address: ""
    }
  });
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    birthdate: "",
    gender: "",
    status: ""
  });
  const [modal, setModal] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [vehicleInfo, setVehicleInfo] = useState({
    vehicles: [
      {
        id: 1,
        type: "Motorcycle",
        brand: "Honda",
        model: "Click 125",
        year: "2023",
        plateNumber: "ABC 1234",
        orNumber: "123456789",
        crNumber: "987654321",
        isDefault: true,
        verified: true
      }
    ],
    permits: [
      {
        id: 1,
        type: "Business Permit",
        number: "BP-2024-001",
        expiryDate: "2024-12-31",
        verified: true
      }
    ]
  });

  const [newVehicle, setNewVehicle] = useState({
    type: "Motorcycle",
    brand: "",
    model: "",
    year: new Date().getFullYear().toString(),
    plateNumber: "",
    orNumber: "",
    crNumber: "",
    isDefault: false
  });

  const [newPermit, setNewPermit] = useState({
    type: "Business Permit",
    number: "",
    expiryDate: "",
    isDefault: false
  });

  const loadUserProfile = async (userId) => {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error("Error loading user profile:", error);
      return null;
    }
  };

  const saveProfileToFirestore = async (userId, profileData) => {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, {
        ...profileData,
        lastUpdated: new Date()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error("Error saving profile to Firestore:", error);
      throw error;
    }
  };

  // Function to refresh profile data
  const refreshProfileData = async () => {
    if (user) {
      try {
        const userProfile = await loadUserProfile(user.uid);
        if (userProfile) {
          setProfile(userProfile);
          setForm({
            name: userProfile.name,
            phone: userProfile.phone || "",
            address: userProfile.address || "",
            birthdate: userProfile.birthdate || "",
            gender: userProfile.gender || "",
            status: userProfile.status || ""
          });
          setImagePreview(userProfile.avatar);
          
          if (onProfileUpdate) {
            onProfileUpdate(userProfile);
          }
        }
      } catch (error) {
        console.error("Error refreshing profile:", error);
      }
    }
  };

  // Function to force page refresh
  const forceRefreshPage = () => {
    console.log("Refreshing page...");
    window.location.reload();
  };

  // Load user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        const userProfile = await loadUserProfile(currentUser.uid);
        
        const defaultProfile = {
          name: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
          email: currentUser.email || "",
          phone: "",
          address: "",
          birthdate: "",
          gender: "",
          status: "",
          avatar: currentUser.photoURL || "https://cdn-icons-png.flaticon.com/512/219/219983.png",
          location: {
            latitude: null,
            longitude: null,
            address: ""
          }
        };
        
        const mergedProfile = { ...defaultProfile, ...userProfile };
        
        setProfile(mergedProfile);
        setForm({
          name: mergedProfile.name,
          phone: mergedProfile.phone || "",
          address: mergedProfile.address || "",
          birthdate: mergedProfile.birthdate || "",
          gender: mergedProfile.gender || "",
          status: mergedProfile.status || ""
        });
        setImagePreview(mergedProfile.avatar);
        
        if (onProfileUpdate) {
          onProfileUpdate(mergedProfile);
        }
      }
    });

    return () => unsubscribe();
  }, [onProfileUpdate]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setModal(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { 
    if (modal === "edit") {
      setForm({
        name: profile.name,
        phone: profile.phone || "",
        address: profile.address || "",
        birthdate: profile.birthdate || "",
        gender: profile.gender || "",
        status: profile.status || ""
      });
      setImagePreview(profile.avatar);
      setSelectedImage(null);
      setUploadProgress(0);
      setIsUploadingImage(false);
    }
    if (modal === "add-vehicle") {
      setNewVehicle({
        type: "Motorcycle",
        brand: "",
        model: "",
        year: new Date().getFullYear().toString(),
        plateNumber: "",
        orNumber: "",
        crNumber: "",
        isDefault: false
      });
    }
    if (modal === "add-permit") {
      setNewPermit({
        type: "Business Permit",
        number: "",
        expiryDate: "",
        isDefault: false
      });
    }
  }, [modal, profile]);

  const initials = useMemo(() => {
    const p = profile.name.trim().split(" ");
    return (p[0]?.[0] || "M") + (p[1]?.[0] || "");
  }, [profile.name]);

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate("/login", { replace: true });
  };

  const open = (t) => setModal(t);
  const close = () => {
    setModal(null);
    setSaveStatus("");
    setSelectedImage(null);
    setImagePreview(profile.avatar);
    setUploadProgress(0);
    setIsUploadingImage(false);
  };
  
  const updateForm = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const updateNewVehicle = (e) => {
    const { name, value, type, checked } = e.target;
    setNewVehicle(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const updateNewPermit = (e) => {
    const { name, value, type, checked } = e.target;
    setNewPermit(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setSaveStatus("❌ Please select a valid image file (JPG, PNG, etc.)");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setSaveStatus("❌ Image size should be less than 5MB");
        return;
      }

      setSelectedImage(file);
      setIsUploadingImage(true);
      setSaveStatus("🔄 Processing image...");
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        setIsUploadingImage(false);
        setSaveStatus("✅ Image ready for upload");
      };
      reader.onerror = () => {
        setIsUploadingImage(false);
        setSaveStatus("❌ Failed to process image");
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(profile.avatar);
    setUploadProgress(0);
    setIsUploadingImage(false);
    setSaveStatus("");
  };

  const uploadImage = async (file, userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        setIsUploadingImage(true);
        setUploadProgress(10);
        setSaveStatus("🔄 Starting upload...");

        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `profile_${timestamp}.${fileExtension}`;
        const storageRef = ref(storage, `profile-pictures/${userId}/${fileName}`);
        
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        setUploadProgress(30);
        setSaveStatus("🔄 Uploading to storage...");

        const snapshot = await uploadBytes(storageRef, file);
        
        clearInterval(progressInterval);
        setUploadProgress(70);
        setSaveStatus("🔄 Getting download URL...");

        const downloadURL = await getDownloadURL(snapshot.ref);
        
        setUploadProgress(100);
        setSaveStatus("✅ Image uploaded successfully!");
        
        setTimeout(() => {
          setIsUploadingImage(false);
          setUploadProgress(0);
        }, 1000);

        resolve(downloadURL);
      } catch (error) {
        setIsUploadingImage(false);
        setUploadProgress(0);
        setSaveStatus("❌ Upload failed");
        reject(error);
      }
    });
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSaveStatus("❌ Geolocation is not supported by this browser.");
      return;
    }

    setIsGettingLocation(true);
    setSaveStatus("📍 Getting your location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          
          let address = "";
          if (response.ok) {
            const data = await response.json();
            address = `${data.city || data.locality}, ${data.principalSubdivision || data.region}`;
            setSaveStatus("✅ Location updated successfully!");
          } else {
            address = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
            setSaveStatus("📍 Location detected (coordinates only)");
          }

          setForm(prev => ({ 
            ...prev, 
            address
          }));
          
        } catch (error) {
          console.error("Error getting address:", error);
          const { latitude, longitude } = position.coords;
          const address = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
          
          setForm(prev => ({ 
            ...prev, 
            address
          }));
          setSaveStatus("📍 Location detected (coordinates only)");
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        let errorMessage = "❌ Unable to get your location. ";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Please allow location access in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out.";
            break;
          default:
            errorMessage += "An unknown error occurred.";
            break;
        }
        
        setSaveStatus(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();
    const birthdate = form.birthdate;
    const gender = form.gender;
    const status = form.status;
    
    const hasInfoChanges = name !== profile.name || 
                          phone !== profile.phone || 
                          address !== profile.address ||
                          birthdate !== profile.birthdate ||
                          gender !== profile.gender ||
                          status !== profile.status;
    
    const hasImageChanges = selectedImage !== null;
    
    if (!hasInfoChanges && !hasImageChanges) {
      setSaveStatus("ℹ️ No changes detected");
      return;
    }
    
    if (!name) {
      setSaveStatus("❌ Please enter your name");
      return;
    }

    setIsUpdating(true);
    setSaveStatus("🔄 Updating profile...");

    try {
      let avatarUrl = profile.avatar;

      if (selectedImage && user) {
        setSaveStatus("🔄 Uploading profile picture...");
        avatarUrl = await uploadImage(selectedImage, user.uid);
      }

      if (user) {
        await updateProfile(auth.currentUser, {
          displayName: name,
          photoURL: avatarUrl
        });
      }

      const updatedProfile = {
        ...profile,
        name,
        phone,
        address,
        birthdate,
        gender,
        status,
        avatar: avatarUrl,
        updatedAt: new Date().toISOString()
      };
      
      // Update local state immediately
      setProfile(updatedProfile);
      
      // Save to Firestore
      if (user) {
        await saveProfileToFirestore(user.uid, updatedProfile);
      }
      
      // Notify parent component
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }
      
      setSaveStatus("✅ Profile updated successfully!");
      
      // Auto refresh after 1.5 seconds
      setTimeout(() => {
        close();
        // Force page refresh to show updated data
        forceRefreshPage();
      }, 1500);
      
    } catch (error) {
      console.error("Error updating profile:", error);
      setSaveStatus("❌ Failed to update profile. Please try again.");
    } finally {
      setIsUpdating(false);
      setUploadProgress(0);
      setIsUploadingImage(false);
    }
  };

  const addNewVehicle = (e) => {
    e.preventDefault();
    
    const { type, brand, model, year, plateNumber, orNumber, crNumber, isDefault } = newVehicle;
    
    if (!brand.trim() || !model.trim() || !plateNumber.trim()) {
      setSaveStatus("❌ Please fill in all required fields");
      return;
    }

    setIsUpdating(true);
    setSaveStatus("🔄 Adding vehicle...");

    try {
      const newVehicleData = {
        id: Date.now(),
        type: type.trim(),
        brand: brand.trim(),
        model: model.trim(),
        year: year.trim(),
        plateNumber: plateNumber.trim(),
        orNumber: orNumber.trim(),
        crNumber: crNumber.trim(),
        isDefault: isDefault,
        verified: false
      };

      setVehicleInfo(prev => ({
        ...prev,
        vehicles: [...prev.vehicles, newVehicleData]
      }));

      if (isDefault) {
        setDefaultVehicle(vehicleInfo.vehicles.length);
      }

      setSaveStatus("✅ Vehicle added successfully!");
      
      setTimeout(() => {
        setModal("vehicle");
        setIsUpdating(false);
      }, 1500);

    } catch (error) {
      console.error("Error adding vehicle:", error);
      setSaveStatus("❌ Failed to add vehicle. Please try again.");
      setIsUpdating(false);
    }
  };

  const addNewPermit = (e) => {
    e.preventDefault();
    
    const { type, number, expiryDate, isDefault } = newPermit;
    
    if (!number.trim() || !expiryDate) {
      setSaveStatus("❌ Please fill in all required fields");
      return;
    }

    setIsUpdating(true);
    setSaveStatus("🔄 Adding permit...");

    try {
      const newPermitData = {
        id: Date.now(),
        type: type.trim(),
        number: number.trim(),
        expiryDate: expiryDate,
        verified: false,
        isDefault: isDefault
      };

      setVehicleInfo(prev => ({
        ...prev,
        permits: [...prev.permits, newPermitData]
      }));

      setSaveStatus("✅ Permit added successfully!");
      
      setTimeout(() => {
        setModal("vehicle");
        setIsUpdating(false);
      }, 1500);

    } catch (error) {
      console.error("Error adding permit:", error);
      setSaveStatus("❌ Failed to add permit. Please try again.");
      setIsUpdating(false);
    }
  };

  const setDefaultVehicle = (index) => {
    setVehicleInfo(prev => ({
      ...prev,
      vehicles: prev.vehicles.map((vehicle, i) => ({
        ...vehicle,
        isDefault: i === index
      }))
    }));
  };

  const deleteVehicle = (id) => {
    setVehicleInfo(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter(vehicle => vehicle.id !== id)
    }));
  };

  const deletePermit = (id) => {
    setVehicleInfo(prev => ({
      ...prev,
      permits: prev.permits.filter(permit => permit.id !== id)
    }));
  };

  if (!user) {
    return (
      <div className="profile-container">
        <main className="profile-content">
          <div className="loading-state">
            <p>Loading profile...</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="profile-container">
      <main className="profile-content">
        <section className="profile-header">
          <div className="profile-avatar-section">
            <div className="avatar-container">
              {profile.avatar ? (
                <img 
                  className="profile-avatar" 
                  src={profile.avatar} 
                  alt={profile.name}
                  onError={(e) => { 
                    e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/219/219983.png"; 
                  }} 
                />
              ) : (
                <div className="avatar-fallback">{initials.toUpperCase()}</div>
              )}
            </div>
            
            <div className="profile-main-info">
              <h2 className="profile-name">{profile.name}</h2>
              <div className="profile-contact-info">
                {profile.email && (
                  <div className="contact-item">
                    <FaEnvelope className="contact-icon" />
                    <span className="contact-text">{profile.email}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="contact-item">
                    <FaPhone className="contact-icon" />
                    <span className="contact-text">{profile.phone}</span>
                  </div>
                )}
                {profile.address && (
                  <div className="contact-item">
                    <FaMapMarkerAlt className="contact-icon" />
                    <span className="contact-text">{profile.address}</span>
                  </div>
                )}
              </div>
              
              {(profile.birthdate || profile.gender || profile.status) && (
                <div className="profile-additional-info">
                  {profile.birthdate && (
                    <div className="info-item">
                      <span className="info-label">Birthday:</span>
                      <span className="info-value">{profile.birthdate}</span>
                    </div>
                  )}
                  {profile.gender && (
                    <div className="info-item">
                      <span className="info-label">Gender:</span>
                      <span className="info-value">{profile.gender}</span>
                    </div>
                  )}
                  {profile.status && (
                    <div className="info-item">
                      <span className="info-label">Status:</span>
                      <span className="info-value">{profile.status}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="profile-options">
          <button className="option" onClick={() => open("edit")}>
            <div className="icon edit"><FaUserEdit /></div>
            <div className="option-text"><h4>Edit Profile</h4><p>Update your personal information</p></div>
          </button>

          <button className="option" onClick={() => open("vehicle")}>
            <div className="icon vehicle"><FaCar /></div>
            <div className="option-text"><h4>Vehicle Information</h4><p>For pasabuyers (vehicle & permit)</p></div>
          </button>

          {/* ADDED: Quick access to Pasabuyer History */}
          <button className="option" onClick={() => navigate("/pasabuyer-history")}>
            <div className="icon history"><FaHistory /></div>
            <div className="option-text"><h4>Pasabuyer History</h4><p>View your delivery history & earnings</p></div>
          </button>

          {/* ADDED: Quick access to My Requests */}
          <button className="option" onClick={() => navigate("/my-requests")}>
            <div className="icon requests"><FaListAlt /></div>
            <div className="option-text"><h4>My Requests</h4><p>Track your pasabuy requests</p></div>
          </button>

          <button className="option" onClick={() => navigate("/notifications")}>
            <div className="icon notif"><FaBell /></div>
            <div className="option-text"><h4>Notifications</h4><p>Manage notification preferences</p></div>
          </button>

          {/* ADDED: Quick access to other features */}
          <button className="option" onClick={() => navigate("/request")}>
            <div className="icon request"><FaBox /></div>
            <div className="option-text"><h4>Make Request</h4><p>Create new pasabuy request</p></div>
          </button>

          <button className="option" onClick={() => navigate("/pasabuyer")}>
            <div className="icon pasabuyer"><FaCar /></div>
            <div className="option-text"><h4>Be a Pasabuyer</h4><p>Start earning as a pasabuyer</p></div>
          </button>

          <button className="option" onClick={() => navigate("/chatbot")}>
            <div className="icon chatbot"><FaRobot /></div>
            <div className="option-text"><h4>Chatbot Assistant</h4><p>Get help from our AI assistant</p></div>
          </button>

          <button className="option logout mobile-only" onClick={() => open("logout")}>
            <div className="icon logout-icon"><FaSignOutAlt /></div>
            <div className="option-text"><h4>Logout</h4><p>Sign out from your account</p></div>
          </button>
        </section>
      </main>

      <BottomNav />

      {modal && (
        <div className="sheet-backdrop" onClick={(e) => e.target.classList.contains("sheet-backdrop") && close()}>
          <section className="sheet" role="dialog" aria-modal="true">
            
            {modal === "edit" && (
              <>
                <header className="sheet-header">
                  <h3>Edit Profile</h3>
                  <button className="sheet-close" aria-label="Close" onClick={close} disabled={isUpdating || isUploadingImage}>✕</button>
                </header>

                <form className="sheet-body" onSubmit={saveProfile}>
                  <div className="avatar-upload-section">
                    <div className="avatar-preview">
                      <img 
                        src={imagePreview} 
                        alt="Profile preview" 
                        className="avatar-preview-image"
                      />
                      {isUploadingImage && (
                        <div className="avatar-loading-overlay">
                          <FaSpinner className="loading-spinner" />
                          <span>Uploading...</span>
                        </div>
                      )}
                      <div className="avatar-overlay">
                        <FaCamera className="camera-icon" />
                        <span>Change Photo</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="avatar-file-input"
                        disabled={isUpdating || isUploadingImage}
                      />
                    </div>
                    
                    {uploadProgress > 0 && (
                      <div className="upload-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <span className="progress-text">Uploading: {uploadProgress}%</span>
                      </div>
                    )}
                    
                    {selectedImage && !isUploadingImage && (
                      <div className="selected-image-info">
                        <span>{selectedImage.name}</span>
                        <button 
                          type="button" 
                          className="remove-image-btn"
                          onClick={removeSelectedImage}
                          disabled={isUpdating}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid">
                    <label className="field">
                      <span>Name *</span>
                      <input 
                        name="name" 
                        value={form.name} 
                        onChange={updateForm} 
                        placeholder="Your full name" 
                        required 
                        disabled={isUpdating}
                      />
                    </label>
                    <label className="field">
                      <span>Phone</span>
                      <input 
                        name="phone" 
                        value={form.phone} 
                        onChange={updateForm} 
                        placeholder="09xxxxxxxxx" 
                        disabled={isUpdating}
                      />
                    </label>
                    <label className="field">
                      <span>Birthdate</span>
                      <div className="input-with-icon">
                        <FaCalendarAlt className="input-icon" />
                        <input 
                          type="date" 
                          name="birthdate" 
                          value={form.birthdate} 
                          onChange={updateForm} 
                          disabled={isUpdating}
                        />
                      </div>
                    </label>
                    <label className="field">
                      <span>Gender</span>
                      <div className="input-with-icon">
                        <FaVenusMars className="input-icon" />
                        <select 
                          name="gender" 
                          value={form.gender} 
                          onChange={updateForm}
                          disabled={isUpdating}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </label>
                    <label className="field col-span">
                      <span>Status</span>
                      <div className="input-with-icon">
                        <FaUserTag className="input-icon" />
                        <select 
                          name="status" 
                          value={form.status} 
                          onChange={updateForm}
                          disabled={isUpdating}
                        >
                          <option value="">Select Status</option>
                          <option value="Student">Student</option>
                          <option value="Employed">Employed</option>
                          <option value="Self-Employed">Self-Employed</option>
                          <option value="Unemployed">Unemployed</option>
                          <option value="Business Owner">Business Owner</option>
                        </select>
                      </div>
                    </label>
                    <label className="field col-span">
                      <span>Address</span>
                      <div className="address-input-group">
                        <input 
                          name="address" 
                          value={form.address} 
                          onChange={updateForm} 
                          placeholder="Enter your address or click Get Location" 
                          disabled={isUpdating}
                        />
                        <button 
                          type="button"
                          className="location-btn"
                          onClick={getCurrentLocation}
                          disabled={isGettingLocation || isUpdating}
                        >
                          <FaMapMarkerAlt />
                          {isGettingLocation ? "Getting..." : "Get Location"}
                        </button>
                      </div>
                      <small className="location-hint">
                        Click "Get Location" to automatically detect your current address
                      </small>
                    </label>
                  </div>

                  {saveStatus && (
                    <div className={`save-status ${saveStatus.includes("✅") ? "success" : saveStatus.includes("❌") ? "error" : "info"}`}>
                      {saveStatus}
                    </div>
                  )}

                  <footer className="sheet-actions">
                    <button type="button" className="btn ghost" onClick={close} disabled={isUpdating || isUploadingImage}>
                      Cancel
                    </button>
                    <button type="submit" className="btn" disabled={isUpdating || isUploadingImage}>
                      {isUpdating ? (
                        <>
                          <FaSpinner className="loading-spinner-btn" />
                          Updating...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </footer>
                </form>
              </>
            )}

            {modal === "vehicle" && (
              <>
                <header className="sheet-header">
                  <h3>Vehicle Information</h3>
                  <button className="sheet-close" aria-label="Close" onClick={close}>✕</button>
                </header>

                <div className="sheet-body vehicle-info">
                  <div className="vehicle-section">
                    <h4 className="vehicle-title">
                      <FaCar className="vehicle-icon" />
                      My Vehicles
                    </h4>
                    <p className="vehicle-desc">Manage your registered vehicles for pasabuy services</p>
                    
                    {vehicleInfo.vehicles.map((vehicle, index) => (
                      <div key={vehicle.id} className="vehicle-card">
                        <div className="vehicle-header">
                          <div className="vehicle-basic-info">
                            <span className="vehicle-type">{vehicle.type}</span>
                            <span className="vehicle-model">{vehicle.brand} {vehicle.model} ({vehicle.year})</span>
                          </div>
                          <div className="vehicle-status">
                            <span className={`verification-badge ${vehicle.verified ? 'verified' : 'pending'}`}>
                              {vehicle.verified ? '✓ Verified' : '⏳ Pending'}
                            </span>
                            {vehicle.isDefault && (
                              <span className="default-badge">Default</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="vehicle-details">
                          <div className="detail-row">
                            <span className="detail-label">Plate Number:</span>
                            <span className="detail-value">{vehicle.plateNumber}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">OR Number:</span>
                            <span className="detail-value">{vehicle.orNumber}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">CR Number:</span>
                            <span className="detail-value">{vehicle.crNumber}</span>
                          </div>
                        </div>
                        
                        <div className="vehicle-actions">
                          <button 
                            className={`btn-set-default ${vehicle.isDefault ? 'default' : ''}`}
                            onClick={() => setDefaultVehicle(index)}
                          >
                            {vehicle.isDefault ? '✓ Default Vehicle' : 'Set as Default'}
                          </button>
                          <button className="btn-delete" onClick={() => deleteVehicle(vehicle.id)}>
                            <FaTrash /> Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="vehicle-section">
                    <h4 className="vehicle-title">
                      <FaCar className="vehicle-icon permit" />
                      Business Permits & Documents
                    </h4>
                    <p className="vehicle-desc">Required permits for pasabuy operations</p>
                    
                    {vehicleInfo.permits.map((permit) => (
                      <div key={permit.id} className="permit-card">
                        <div className="permit-header">
                          <div className="permit-info">
                            <span className="permit-type">{permit.type}</span>
                            <span className="permit-number">{permit.number}</span>
                          </div>
                          <div className="permit-status">
                            <span className={`verification-badge ${permit.verified ? 'verified' : 'pending'}`}>
                              {permit.verified ? '✓ Verified' : '⏳ Pending'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="permit-details">
                          <div className="detail-row">
                            <span className="detail-label">Expiry Date:</span>
                            <span className="detail-value">{permit.expiryDate}</span>
                          </div>
                        </div>
                        
                        <div className="permit-actions">
                          <button className="btn-delete" onClick={() => deletePermit(permit.id)}>
                            <FaTrash /> Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="vehicle-notes">
                    <h5>Important Requirements for Pasabuyers:</h5>
                    <ul>
                      <li>✓ Valid driver's license</li>
                      <li>✓ Vehicle registration (OR/CR)</li>
                      <li>✓ Business permit for commercial operations</li>
                      <li>✓ Vehicle must be in good condition</li>
                      <li>✓ Insurance coverage (recommended)</li>
                    </ul>
                  </div>

                  <footer className="sheet-actions">
                    <button type="button" className="btn ghost" onClick={close}>Close</button>
                    <div className="action-buttons">
                      <button type="button" className="btn primary" onClick={() => setModal('add-vehicle')}>
                        <FaPlus /> Add Vehicle
                      </button>
                      <button type="button" className="btn primary" onClick={() => setModal('add-permit')}>
                        <FaPlus /> Add Permit
                      </button>
                    </div>
                  </footer>
                </div>
              </>
            )}

            {modal === "add-vehicle" && (
              <>
                <header className="sheet-header">
                  <h3>Add New Vehicle</h3>
                  <button className="sheet-close" aria-label="Close" onClick={() => setModal('vehicle')}>✕</button>
                </header>

                <form className="sheet-body" onSubmit={addNewVehicle}>
                  <div className="grid">
                    <label className="field">
                      <span>Vehicle Type *</span>
                      <select 
                        name="type" 
                        value={newVehicle.type} 
                        onChange={updateNewVehicle}
                        className="vehicle-type-select"
                        disabled={isUpdating}
                      >
                        <option value="Motorcycle">Motorcycle</option>
                        <option value="Car">Car</option>
                        <option value="Van">Van</option>
                        <option value="Truck">Truck</option>
                      </select>
                    </label>

                    <label className="field">
                      <span>Brand *</span>
                      <input 
                        type="text" 
                        name="brand" 
                        value={newVehicle.brand} 
                        onChange={updateNewVehicle}
                        placeholder="Honda, Toyota, etc."
                        required 
                        disabled={isUpdating}
                      />
                    </label>

                    <label className="field">
                      <span>Model *</span>
                      <input 
                        type="text" 
                        name="model" 
                        value={newVehicle.model} 
                        onChange={updateNewVehicle}
                        placeholder="Click 125, Vios, etc."
                        required 
                        disabled={isUpdating}
                      />
                    </label>

                    <label className="field">
                      <span>Year *</span>
                      <input 
                        type="number" 
                        name="year" 
                        value={newVehicle.year} 
                        onChange={updateNewVehicle}
                        min="1990"
                        max={new Date().getFullYear()}
                        required 
                        disabled={isUpdating}
                      />
                    </label>

                    <label className="field">
                      <span>Plate Number *</span>
                      <input 
                        type="text" 
                        name="plateNumber" 
                        value={newVehicle.plateNumber} 
                        onChange={updateNewVehicle}
                        placeholder="ABC 1234"
                        required 
                        disabled={isUpdating}
                      />
                    </label>

                    <label className="field">
                      <span>OR Number</span>
                      <input 
                        type="text" 
                        name="orNumber" 
                        value={newVehicle.orNumber} 
                        onChange={updateNewVehicle}
                        placeholder="Official Receipt Number"
                        disabled={isUpdating}
                      />
                    </label>

                    <label className="field col-span">
                      <span>CR Number</span>
                      <input 
                        type="text" 
                        name="crNumber" 
                        value={newVehicle.crNumber} 
                        onChange={updateNewVehicle}
                        placeholder="Certificate of Registration Number"
                        disabled={isUpdating}
                      />
                    </label>

                    <label className="field col-span checkbox-field">
                      <input 
                        type="checkbox" 
                        name="isDefault" 
                        checked={newVehicle.isDefault} 
                        onChange={updateNewVehicle}
                        disabled={isUpdating}
                      />
                      <span>Set as default vehicle</span>
                    </label>
                  </div>

                  {saveStatus && (
                    <div className={`save-status ${saveStatus.includes("✅") ? "success" : "error"}`}>
                      {saveStatus}
                    </div>
                  )}

                  <footer className="sheet-actions">
                    <button type="button" className="btn ghost" onClick={() => setModal('vehicle')} disabled={isUpdating}>
                      Cancel
                    </button>
                    <button type="submit" className="btn primary" disabled={isUpdating}>
                      {isUpdating ? (
                        <>
                          <FaSpinner className="loading-spinner-btn" />
                          Adding...
                        </>
                      ) : (
                        "Add Vehicle"
                      )}
                    </button>
                  </footer>
                </form>
              </>
            )}

            {modal === "add-permit" && (
              <>
                <header className="sheet-header">
                  <h3>Add New Permit</h3>
                  <button className="sheet-close" aria-label="Close" onClick={() => setModal('vehicle')}>✕</button>
                </header>

                <form className="sheet-body" onSubmit={addNewPermit}>
                  <div className="grid">
                    <label className="field">
                      <span>Permit Type *</span>
                      <select 
                        name="type" 
                        value={newPermit.type} 
                        onChange={updateNewPermit}
                        className="permit-type-select"
                        disabled={isUpdating}
                      >
                        <option value="Business Permit">Business Permit</option>
                        <option value="Mayor's Permit">Mayor's Permit</option>
                        <option value="Barangay Permit">Barangay Permit</option>
                        <option value="Transport Permit">Transport Permit</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>

                    <label className="field col-span">
                      <span>Permit Number *</span>
                      <input 
                        type="text" 
                        name="number" 
                        value={newPermit.number} 
                        onChange={updateNewPermit}
                        placeholder="Enter permit number"
                        required 
                        disabled={isUpdating}
                      />
                    </label>

                    <label className="field col-span">
                      <span>Expiry Date *</span>
                      <input 
                        type="date" 
                        name="expiryDate" 
                        value={newPermit.expiryDate} 
                        onChange={updateNewPermit}
                        required 
                        disabled={isUpdating}
                      />
                    </label>

                    <label className="field col-span checkbox-field">
                      <input 
                        type="checkbox" 
                        name="isDefault" 
                        checked={newPermit.isDefault} 
                        onChange={updateNewPermit}
                        disabled={isUpdating}
                      />
                      <span>Mark as primary permit</span>
                    </label>
                  </div>

                  {saveStatus && (
                    <div className={`save-status ${saveStatus.includes("✅") ? "success" : "error"}`}>
                      {saveStatus}
                    </div>
                  )}

                  <footer className="sheet-actions">
                    <button type="button" className="btn ghost" onClick={() => setModal('vehicle')} disabled={isUpdating}>
                      Cancel
                    </button>
                    <button type="submit" className="btn primary" disabled={isUpdating}>
                      {isUpdating ? (
                        <>
                          <FaSpinner className="loading-spinner-btn" />
                          Adding...
                        </>
                      ) : (
                        "Add Permit"
                      )}
                    </button>
                  </footer>
                </form>
              </>
            )}

            {modal === "notifications" && (
              <>
                <header className="sheet-header">
                  <h3>Notifications</h3>
                  <button className="sheet-close" aria-label="Close" onClick={close}>✕</button>
                </header>
                <div className="sheet-body">
                  <div className="placeholder">
                    <p>Placeholder content for <b>notifications</b>. Add forms/toggles here later.</p>
                  </div>
                  <footer className="sheet-actions">
                    <button type="button" className="btn ghost" onClick={close}>Close</button>
                    <button type="button" className="btn" onClick={close}>Done</button>
                  </footer>
                </div>
              </>
            )}

            {modal === "logout" && (
              <>
                <header className="sheet-header">
                  <h3>Confirm Logout</h3>
                  <button className="sheet-close" aria-label="Close" onClick={close}>✕</button>
                </header>
                <div className="sheet-body">
                  <p>Are you sure you want to sign out of your account?</p>
                  <footer className="sheet-actions">
                    <button className="btn ghost" onClick={close}>Cancel</button>
                    <button className="btn danger" type="button" onClick={handleLogout}>Logout</button>
                  </footer>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Profile;