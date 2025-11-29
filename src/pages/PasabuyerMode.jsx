import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiMapPin, FiArrowLeft, FiRefreshCw, FiMap, FiClock } from "react-icons/fi";
import { 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  setDoc,
  getDoc
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import NearbyRequestsForm from "./NearbyRequestsForm";
import ViewDetails from "./ViewDetails";
import "./PasabuyerMode.css";

const PasabuyerMode = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const locationWatchIdRef = useRef(null);
  
  const [isOnline, setIsOnline] = useState(false);
  const [requests, setRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [userAddress, setUserAddress] = useState("");
  const [showMap, setShowMap] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showViewDetails, setShowViewDetails] = useState(false);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationWatchIdRef.current) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
      }
    };
  }, []);

  // Initialize map when user goes online and has location
  useEffect(() => {
    if (isOnline && showMap && userLocation) {
      if (!mapLoaded) {
        loadLeafletScript();
      } else {
        initializeMap();
      }
    }
  }, [isOnline, showMap, mapLoaded, userLocation]);

  // Load Leaflet script
  const loadLeafletScript = () => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js';
    script.integrity = 'sha512-XQoYMqMTK8LvdxXYG3nZ448hOEQiglfqkJs1NOQV44cWnUrBc8PkAOcXy20w0vlaXaVUearIOBhiXZ5V3ynxwA==';
    script.crossOrigin = '';
    script.onload = () => {
      setMapLoaded(true);
      if (userLocation) initializeMap();
    };
    document.head.appendChild(script);
  };

  // Get user on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
        console.log(`👤 User authenticated: ${currentUser.uid}`);
        
        const savedOnlineStatus = localStorage.getItem('pasabuyerOnline');
        if (savedOnlineStatus === 'true') {
          console.log("🔄 Restoring previous online status...");
          setIsOnline(true);
          getUserLocation().then(() => {
            fetchAllActiveRequests();
          });
        } else {
          getUserLocation();
        }
      } else {
        console.log("❌ No user authenticated");
      }
    });

    return () => unsubscribe();
  }, []);

  // Setup when user goes online
  useEffect(() => {
    if (isOnline && userId) {
      console.log("🚀 User went ONLINE - starting services...");
      fetchAllActiveRequests();
      startLocationTracking();
    } else {
      console.log("🔴 User went OFFLINE - stopping services...");
      setRequests([]);
      setAllRequests([]);
      stopLocationTracking();
    }
  }, [isOnline, userId]);

  // FIXED: Create chat thread - PREVENTS DUPLICATES
  const createChatThread = async (request, pasabuyerId) => {
    try {
      console.log("💬 Creating chat thread...");
      
      const requesterId = request.userId;
      const chatId = `${requesterId}_${pasabuyerId}_${request.id}`;
      
      // Check if chat already exists
      const chatRef = doc(db, "chats", chatId);
      const existingChat = await getDoc(chatRef);
      
      if (existingChat.exists()) {
        console.log("ℹ️ Chat already exists, returning existing chat ID");
        return chatId;
      }
      
      const chatData = {
        id: chatId,
        participants: [requesterId, pasabuyerId],
        participantNames: {
          [requesterId]: request.user || "Requester",
          [pasabuyerId]: "Pasabuyer"
        },
        requestId: request.id,
        requestDetails: {
          title: request.title,
          store: request.storeLocation || request.location,
          budget: request.price || 0,
          status: "accepted"
        },
        lastMessage: "Tinanggap ko na ang iyong order!",
        lastUpdated: serverTimestamp(),
        createdAt: serverTimestamp(),
        messages: []
      };

      await setDoc(chatRef, chatData);
      
      console.log("✅ Chat created successfully:", chatId);
      return chatId;

    } catch (error) {
      console.error("❌ Error creating chat:", error);
      // Don't throw error, just return null and continue
      return null;
    }
  };

  // FIXED: Update request status - PREVENTS DUPLICATES
  // FIXED: Update request status - HANDLES UNDEFINED VALUES
const updateRequestStatus = async (request, pasabuyerId) => {
  try {
    console.log("📝 UPDATING REQUEST STATUS...");
    console.log("Request ID:", request.id);
    console.log("Pasabuyer ID:", pasabuyerId);
    console.log("Request data:", request);
    
    let updateSuccess = false;

    // METHOD 1: Try global collection with setDoc + merge
    try {
      const globalRequestRef = doc(db, "requests", request.id);
      
      // First check if request already exists and is accepted
      const existingDoc = await getDoc(globalRequestRef);
      if (existingDoc.exists()) {
        const existingData = existingDoc.data();
        if (existingData.acceptedBy && existingData.acceptedBy !== pasabuyerId) {
          throw new Error("Request already accepted by another pasabuyer");
        }
        if (existingData.acceptedBy === pasabuyerId) {
          console.log("ℹ️ Request already accepted by current user");
          return true; // Already accepted, no need to update
        }
      }
      
      console.log("🔄 Updating global collection...");
      
      // Create update data object with proper fallbacks for undefined values
      const updateData = {
        status: "accepted",
        acceptedBy: pasabuyerId,
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Only add fields that have values (not undefined)
      if (request.title) updateData.title = request.title;
      if (request.price !== undefined) updateData.price = request.price;
      if (request.storeLocation) updateData.storeLocation = request.storeLocation;
      if (request.deliveryLocation) updateData.deliveryLocation = request.deliveryLocation;
      if (request.quantity !== undefined) updateData.quantity = request.quantity;
      if (request.userId) updateData.userId = request.userId;
      if (request.user) updateData.user = request.user;
      if (request.itemName || request.title) updateData.itemName = request.itemName || request.title;
      if (request.budget !== undefined || request.price !== undefined) {
        updateData.budget = request.budget || request.price;
      }
      
      console.log("📦 Update data:", updateData);
      
      await setDoc(globalRequestRef, updateData, { merge: true });
      
      console.log("✅ Global collection updated with setDoc + merge");
      updateSuccess = true;

      // Verify the update
      const updatedDoc = await getDoc(globalRequestRef);
      if (updatedDoc.exists()) {
        const finalData = updatedDoc.data();
        console.log("🔍 VERIFIED - Global collection:", {
          id: updatedDoc.id,
          status: finalData.status,
          acceptedBy: finalData.acceptedBy,
          title: finalData.title
        });
      }
    } catch (globalError) {
      console.log("❌ Global collection update failed:", globalError.message);
      throw globalError; // Re-throw to prevent duplicate creation
    }

    // METHOD 2: Only update user-specific collection if it exists
    if (request.userId && request.userId !== "unknown") {
      try {
        const userRequestRef = doc(db, "users", request.userId, "requests", request.id);
        const userRequestDoc = await getDoc(userRequestRef);
        
        if (userRequestDoc.exists()) {
          await setDoc(userRequestRef, {
            status: "accepted",
            acceptedBy: pasabuyerId,
            acceptedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
          
          console.log("✅ User collection updated with setDoc + merge");
        } else {
          console.log("ℹ️ User collection doesn't exist, skipping");
        }
      } catch (userError) {
        console.log("❌ User collection update failed:", userError.message);
        // Don't throw here, as global update already succeeded
      }
    }

    if (!updateSuccess) {
      throw new Error("Failed to update request in any collection");
    }

    console.log("🎉 Request status updated successfully!");
    
  } catch (error) {
    console.error("❌ Error updating request:", error);
    throw error;
  }
};

  // FIXED: Handle accept request - PREVENTS DUPLICATES
  const handleAcceptRequest = async (request) => {
    try {
      console.log(`✅ ACCEPTING REQUEST: ${request.title}`);
      console.log("📋 Request details:", request);
      
      if (!userId) {
        alert("Please log in first");
        return;
      }

      // Check if request is already accepted by someone else
      if (request.acceptedBy && request.acceptedBy !== userId) {
        alert("❌ This request has already been accepted by another pasabuyer.");
        return;
      }

      // Check if request is already accepted by current user
      if (request.acceptedBy === userId) {
        alert("ℹ️ You have already accepted this request.");
        return;
      }

      // STEP 1: Update request status FIRST (most important)
      console.log("🔄 STEP 1: Updating request status...");
      await updateRequestStatus(request, userId);
      
      // STEP 2: Create chat thread (optional - can fail)
      console.log("🔄 STEP 2: Creating chat thread...");
      const chatId = await createChatThread(request, userId);
      
      // STEP 3: Remove from local state
      console.log("🔄 STEP 3: Updating local state...");
      setRequests(prev => prev.filter(req => req.id !== request.id));
      setAllRequests(prev => prev.filter(req => req.id !== request.id));

      // STEP 4: Show success message
      alert("✅ Successfully accepted the request!");
      
      // STEP 5: Navigate based on chat creation
      if (chatId) {
        console.log(`🚀 Navigating to chat: ${chatId}`);
        navigate('/chat', { 
          state: { 
            openChatId: chatId,
            fromRequestAccept: true 
          }
        });
      } else {
        console.log("ℹ️ Chat not created, navigating to home");
        navigate('/home');
      }

    } catch (error) {
      console.error("❌ ERROR in handleAcceptRequest:", error);
      alert("Failed to accept request: " + error.message);
    }
  };

  // Fetch ALL active requests
  const fetchAllActiveRequests = async () => {
    try {
      console.log("🔄 Fetching active requests...");
      setLoading(true);
      
      const allRequestsData = [];
      
      // Try global requests collection
      try {
        const globalRequestsRef = collection(db, "requests");
        const globalQuery = query(globalRequestsRef, where("status", "==", "Active"));
        const globalSnapshot = await getDocs(globalQuery);
        
        console.log(`🌐 Found ${globalSnapshot.size} active requests`);
        
        globalSnapshot.forEach((doc) => {
          const requestData = doc.data();
          allRequestsData.push({
            id: doc.id,
            userId: requestData.userId || "unknown",
            ...requestData,
            createdAt: requestData.createdAt?.toDate?.() || new Date(),
            time: formatTimeAgo(requestData.createdAt?.toDate?.() || new Date())
          });
        });
      } catch (globalError) {
        console.log("❌ No global requests collection:", globalError.message);
      }
      
      // Try user-specific collections as fallback
      if (allRequestsData.length === 0) {
        try {
          const usersRef = collection(db, "users");
          const usersSnapshot = await getDocs(usersRef);
          
          for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userRequestsRef = collection(db, "users", userId, "requests");
            
            try {
              const userRequestsSnapshot = await getDocs(userRequestsRef);
              
              userRequestsSnapshot.forEach((doc) => {
                const requestData = doc.data();
                if (requestData.status === "Active") {
                  allRequestsData.push({
                    id: doc.id,
                    userId: userId,
                    ...requestData,
                    source: "user-specific",
                    createdAt: requestData.createdAt?.toDate?.() || new Date(),
                    time: formatTimeAgo(requestData.createdAt?.toDate?.() || new Date())
                  });
                }
              });
            } catch (userError) {
              // Skip users without requests collection
            }
          }
        } catch (usersError) {
          console.error("❌ Error fetching users:", usersError);
        }
      }
      
      console.log(`✅ FINAL: Found ${allRequestsData.length} total active requests`);
      setAllRequests(allRequestsData);
      
      // Filter by distance if we have user location
      if (userLocation) {
        filterRequestsWithin5km(allRequestsData, userLocation);
      }
      
    } catch (error) {
      console.error("❌ Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  // Location tracking
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      console.warn("❌ Geolocation not supported");
      return;
    }

    stopLocationTracking();

    console.log("📍 Starting location tracking...");
    
    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { latitude, longitude };
        
        console.log(`📍 New location: ${latitude}, ${longitude}`);
        setUserLocation(newLocation);
        
        try {
          const address = await getAddressFromCoordinates(latitude, longitude);
          setUserAddress(address);
        } catch (error) {
          console.error("❌ Error getting address:", error);
          setUserAddress("Location detected");
        }

        // Save to Firebase if online
        if (isOnline && userId) {
          await saveUserLocationToFirebase(newLocation, userAddress);
        }
        
        // Update map if exists
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 15);
          updateUserMarker(latitude, longitude, userAddress);
        }

        // Filter requests with new location
        if (allRequests.length > 0) {
          filterRequestsWithin5km(allRequests, newLocation);
        }
      },
      (error) => {
        console.error("❌ Error tracking location:", error);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
    
    setIsTracking(true);
  };

  const stopLocationTracking = () => {
    if (locationWatchIdRef.current) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }
    setIsTracking(false);
  };

  // Save user location to Firebase
  const saveUserLocationToFirebase = async (location, address) => {
    if (!userId) return;

    try {
      const userLocationRef = doc(db, "userLocations", userId);
      await setDoc(userLocationRef, {
        userId: userId,
        latitude: location.latitude,
        longitude: location.longitude,
        address: address,
        isOnline: true,
        lastUpdated: serverTimestamp(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log("✅ User location saved to Firebase");
    } catch (error) {
      console.error("❌ Error saving user location:", error);
    }
  };

  // Get address from coordinates
  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      
      if (data && data.address) {
        const address = data.address;
        let addressString = '';
        
        if (address.road) addressString += `${address.road}, `;
        if (address.neighbourhood) addressString += `${address.neighbourhood}, `;
        if (address.suburb) addressString += `${address.suburb}, `;
        if (address.city) addressString += `${address.city}, `;
        if (address.state) addressString += `${address.state}`;
        
        return addressString.trim() || data.display_name || 'Unknown Location';
      }
      
      return 'Unknown Location';
    } catch (error) {
      console.error('❌ Error getting address:', error);
      return 'Location detected';
    }
  };

  // Initialize map
  const initializeMap = () => {
    if (!window.L || !mapRef.current || !userLocation) {
      console.log("❌ Cannot initialize map - missing requirements");
      return;
    }

    console.log("🗺️ Initializing map...");

    // Clear existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      markersRef.current = [];
    }

    const map = window.L.map(mapRef.current).setView(
      [userLocation.latitude, userLocation.longitude], 
      15
    );

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Add user marker
    const userMarker = window.L.marker([userLocation.latitude, userLocation.longitude])
      .addTo(map)
      .bindPopup(`
        <div style="padding: 8px;">
          <strong>📍 Your Location</strong><br>
          ${userAddress}<br>
          <small>${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}</small>
        </div>
      `)
      .openPopup();

    markersRef.current.push(userMarker);
    mapInstanceRef.current = map;

    console.log("✅ Map initialized with user marker");

    // Add request markers if available
    if (requests.length > 0) {
      addRequestMarkers(map, requests);
    }
  };

  // Update user marker on map
  const updateUserMarker = (lat, lng, address) => {
    const userMarker = markersRef.current[0];
    
    if (userMarker) {
      userMarker.setLatLng([lat, lng]);
      userMarker.bindPopup(`
        <div style="padding: 8px;">
          <strong>📍 Your Live Location</strong><br>
          ${address}<br>
          <small>${lat.toFixed(4)}, ${lng.toFixed(4)}</small>
        </div>
      `);
    }
  };

  // Add request markers to map
  const addRequestMarkers = (map, requests) => {
    // Clear existing request markers but keep user marker
    if (markersRef.current.length > 1) {
      markersRef.current.slice(1).forEach(marker => map.removeLayer(marker));
      markersRef.current = markersRef.current.slice(0, 1);
    }

    requests.forEach((request) => {
      const coords = getRequestCoordinates(request);
      
      if (!coords) {
        console.log(`❌ No coordinates for request: "${request.title}"`);
        return;
      }

      const requestMarker = window.L.marker([coords.lat, coords.lng], {
        icon: createRequestIcon()
      })
        .addTo(map)
        .bindPopup(createRequestPopup(request));

      requestMarker.requestId = request.id;
      markersRef.current.push(requestMarker);
    });
  };

  // Get request coordinates
  const getRequestCoordinates = (request) => {
    // Use userLocation if available
    if (request.userLocation && request.userLocation.latitude && request.userLocation.longitude) {
      return {
        lat: request.userLocation.latitude,
        lng: request.userLocation.longitude
      };
    }
    
    // Use store coordinates as fallback
    const storeCoords = getStoreCoordinates(request.storeLocation);
    if (storeCoords) {
      return storeCoords;
    }
    
    // Generate approximate coordinates near user
    if (userLocation) {
      const randomOffset = () => (Math.random() - 0.5) * 0.02;
      return {
        lat: userLocation.latitude + randomOffset(),
        lng: userLocation.longitude + randomOffset()
      };
    }
    
    return null;
  };

  // Create request icon (GREEN pin)
  const createRequestIcon = () => {
    return window.L.divIcon({
      html: `
        <div style="
          background-color: #28a745;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            transform: rotate(45deg);
            color: white;
            font-size: 14px;
            font-weight: bold;
          ">📦</div>
        </div>
      `,
      className: 'custom-request-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  };

  // Create request popup
  const createRequestPopup = (request) => {
    return `
      <div style="padding: 10px; min-width: 250px; font-family: Arial, sans-serif;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="width: 40px; height: 40px; border-radius: 8px; overflow: hidden; background: #f8f9fa; display: flex; align-items: center; justify-content: center;">
            ${request.imageUrl ? 
              `<img src="${request.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="${request.title}" />` : 
              '📦'
            }
          </div>
          <div>
            <strong style="font-size: 14px; color: #333;">${request.title}</strong>
            <div style="font-size: 12px; color: #28a745; font-weight: bold;">${request.distance} km away</div>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 8px; border-radius: 6px; margin: 8px 0; font-size: 12px;">
          <div><strong>👤 Requester:</strong> ${request.user}</div>
          <div><strong>💰 Budget:</strong> ₱${request.price?.toLocaleString() || '0'}</div>
          <div><strong>📍 Store:</strong> ${request.storeLocation}</div>
          <div><strong>🎯 You Earn:</strong> ₱${request.estimatedEarnings}</div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button 
            onclick="window.handleViewDetails('${request.id}')"
            style="
              flex: 1;
              background: #007bff;
              color: white;
              border: none;
              padding: 8px 12px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
              font-weight: bold;
            "
          >
            📋 View Details
          </button>
          <button 
            onclick="window.handleAcceptRequest('${request.id}')"
            style="
              flex: 1;
              background: #28a745;
              color: white;
              border: none;
              padding: 8px 12px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
              font-weight: bold;
            "
          >
            ✅ Accept
          </button>
        </div>
      </div>
    `;
  };

  // Calculate distance between coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Round to 1 decimal
  };

  // Filter requests within 5km
  const filterRequestsWithin5km = (allRequestsData, currentLocation) => {
    if (!currentLocation) return;

    const filtered = allRequestsData
      .map(request => {
        const coords = getRequestCoordinates(request);
        let distance = 999;
        
        if (coords) {
          distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            coords.lat,
            coords.lng
          );
        }
        
        return {
          ...request,
          distance: distance,
          estimatedEarnings: Math.max(50, Math.round((request.price || 0) * 0.07))
        };
      })
      .filter(request => request.distance <= 5)
      .map(request => ({
        ...request,
        contact: request.contact || generateMockContact(),
        specialInstructions: request.note || "No special instructions",
        itemDetails: `${request.title}${request.quantity > 1 ? ` (Quantity: ${request.quantity})` : ''}`
      }));

    console.log(`🎯 ${filtered.length} requests within 5km`);
    setRequests(filtered);

    // Update map markers
    if (showMap && mapInstanceRef.current) {
      addRequestMarkers(mapInstanceRef.current, filtered);
    }
  };

  // Get store coordinates
  const getStoreCoordinates = (storeName) => {
    if (!storeName) return null;

    const stores = {
      "SM City Calapan": { lat: 13.4144, lng: 121.1795 },
      "Robinsons Place Calapan": { lat: 13.4098, lng: 121.1823 },
      "Puregold Calapan": { lat: 13.4120, lng: 121.1800 },
      "Walter Mart Calapan": { lat: 13.4085, lng: 121.1850 },
      "Calapan Public Market": { lat: 13.4115, lng: 121.1810 },
      "Victoria Public Market": { lat: 13.1772, lng: 121.2750 }
    };

    for (const [key, coords] of Object.entries(stores)) {
      if (storeName.toLowerCase().includes(key.toLowerCase())) {
        return coords;
      }
    }

    return null;
  };

  // Generate mock contact
  const generateMockContact = () => {
    return `09${Math.floor(Math.random() * 900000000 + 100000000)}`;
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const actualDate = date?.toDate ? date.toDate() : new Date(date);
    const diffInSeconds = Math.floor((now - actualDate) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Get user location
  const getUserLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const defaultLocation = { latitude: 13.4144, longitude: 121.1795 };
        setUserLocation(defaultLocation);
        setUserAddress("Calapan City, Oriental Mindoro");
        resolve(defaultLocation);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(location);
          
          const address = await getAddressFromCoordinates(location.latitude, location.longitude);
          setUserAddress(address);
          
          resolve(location);
        },
        async (error) => {
          const defaultLocation = { latitude: 13.4144, longitude: 121.1795 };
          setUserLocation(defaultLocation);
          setUserAddress("Calapan City, Oriental Mindoro");
          resolve(defaultLocation);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000,
          maximumAge: 60000 
        }
      );
    });
  };

  // Toggle online status
  const handleToggle = async () => {
    const newOnlineStatus = !isOnline;
    setIsOnline(newOnlineStatus);
    
    localStorage.setItem('pasabuyerOnline', newOnlineStatus.toString());
    
    if (newOnlineStatus) {
      await getUserLocation();
      await fetchAllActiveRequests();
    } else {
      setRequests([]);
      setAllRequests([]);
      stopLocationTracking();
    }
  };

  // Refresh function
  const handleRefresh = async () => {
    await getUserLocation();
    if (isOnline) {
      await fetchAllActiveRequests();
    }
  };

  // Handle view details
  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowViewDetails(true);
  };

  // Handle close view details
  const handleCloseViewDetails = () => {
    setShowViewDetails(false);
    setSelectedRequest(null);
  };

  // Set up global functions for map
  useEffect(() => {
    window.handleViewDetails = (requestId) => {
      const request = requests.find(req => req.id === requestId);
      if (request) {
        handleViewDetails(request);
      }
    };

    window.handleAcceptRequest = async (requestId) => {
      const request = requests.find(req => req.id === requestId);
      if (request) {
        await handleAcceptRequest(request);
      }
    };

    return () => {
      delete window.handleViewDetails;
      delete window.handleAcceptRequest;
    };
  }, [requests]);

  // Filter requests when user location changes and online
  useEffect(() => {
    if (isOnline && userLocation && allRequests.length > 0) {
      filterRequestsWithin5km(allRequests, userLocation);
    }
  }, [userLocation, isOnline, allRequests]);

  // If showing ViewDetails, render only the ViewDetails component
  if (showViewDetails && selectedRequest) {
    return (
      <ViewDetails
        request={selectedRequest}
        onClose={handleCloseViewDetails}
        onSendMessage={() => {}}
        onAcceptRequest={handleAcceptRequest}
      />
    );
  }

  return (
    <div className="pasabuyer-container">
      {/* HEADER */}
      <header className="pasabuyer-header">
        <div className="header-left">
          <button className="exit-circle" onClick={() => navigate("/home")}>
            <FiArrowLeft className="exit-icon" />
          </button>
          <div className="header-text">
            <h2>Pasabuyer Mode</h2>
            <p>Accept nearby requests (within 5 km radius)</p>
            {userLocation && (
              <span className="location-info">
                📍 Your location: {userAddress || "Detecting..."}
                {isTracking && <span className="live-badge">LIVE</span>}
              </span>
            )}
          </div>
        </div>
        
        {/* Map Toggle Button */}
        {isOnline && (
          <button className="map-toggle-btn" onClick={() => setShowMap(!showMap)}>
            <FiMap className="map-icon" />
            {showMap ? 'Show List' : 'Show Map'}
          </button>
        )}
      </header>

      {/* GO ONLINE CARD */}
      <div className="online-card">
        <div className="online-info">
          <h3>Go Online</h3>
          <p>Start accepting requests within 5 km radius</p>
          {userLocation && (
            <span className="location-status">
              ✅ Location ready {isTracking && <span className="tracking-indicator">• Tracking</span>}
            </span>
          )}
        </div>
        <label className="switch">
          <input type="checkbox" checked={isOnline} onChange={handleToggle} />
          <span className="slider"></span>
        </label>
      </div>

      {/* MAP VIEW */}
      {showMap && isOnline && (
        <div className="map-section">
          <div className="map-header">
            <h4>Live Map View</h4>
            <div className="map-stats">
              <span className="requests-count">
                {requests.length} requests within 5km
              </span>
              {isTracking && (
                <span className="tracking-status">
                  <div className="pulse-dot"></div>
                  Live tracking active
                </span>
              )}
            </div>
          </div>
          
          <div className="map-container">
            <div ref={mapRef} className="leaflet-map" />
          </div>
          
          <div className="map-instructions">
            <p>📍 Click on GREEN markers to view details and accept requests</p>
          </div>

          {/* Refresh Button */}
          <div className="refresh-section">
            <button className="refresh-location-btn" onClick={handleRefresh}>
              <FiRefreshCw className="refresh-icon" />
              Refresh Location & Requests
            </button>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>🔄 Loading active requests...</p>
        </div>
      )}

      {/* NEARBY REQUESTS FORM */}
      {!showMap && isOnline && (
        <NearbyRequestsForm
          requests={requests}
          loading={loading}
          isOnline={isOnline}
          onAcceptRequest={handleAcceptRequest}
          onShowMap={() => setShowMap(true)}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* MY HISTORY BUTTON */}
      <div className="history-section">
        <button 
          className="history-btn"
          onClick={() => navigate('/pasabuyer-history')}
        >
          <FiClock className="history-icon" />
          My Pasabuy History
        </button>
      </div>
    </div>
  );
};

export default PasabuyerMode;