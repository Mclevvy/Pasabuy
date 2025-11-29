import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiClock, FiCheck, FiX, FiPackage, FiTruck, FiMessageCircle, FiDatabase, FiUser } from "react-icons/fi";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
  getDoc,
  setDoc
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import "./MyPasabuyRequests.css";

const MyPasabuyRequests = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState("");
  const [pasabuyerNames, setPasabuyerNames] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
        console.log("👤 Current User ID:", currentUser.uid);
        fetchUserRequests(currentUser.uid);
        setupRealTimeListener(currentUser.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // REAL-TIME LISTENER for status updates
  const setupRealTimeListener = (currentUserId) => {
    console.log("👂 Setting up real-time listener for user requests...");
    
    const requestsRef = collection(db, "requests");
    const unsubscribe = onSnapshot(requestsRef, (snapshot) => {
      console.log("🔄 Real-time update received for user requests!");
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Check if this request belongs to current user
        const isUserRequest = 
          data.userId === currentUserId ||
          data.userID === currentUserId ||
          data.user_id === currentUserId ||
          data.user === currentUserId ||
          data.owner === currentUserId ||
          data.requesterId === currentUserId ||
          data.createdBy === currentUserId;
        
        if (isUserRequest) {
          console.log(`📢 Real-time update for request ${doc.id}:`, data.status);
          
          // Update local state if status changed
          setRequests(prevRequests => 
            prevRequests.map(req => 
              req.id === doc.id 
                ? { 
                    ...req, 
                    status: data.status,
                    // Update other fields that might have changed
                    ...data,
                    time: formatTimeAgo(data.updatedAt?.toDate?.() || new Date())
                  }
                : req
            )
          );
        }
      });
    });

    return unsubscribe;
  };

  // Function to get pasabuyer name from user document
  const fetchPasabuyerName = async (pasabuyerId) => {
    if (!pasabuyerId || pasabuyerNames[pasabuyerId]) return;

    try {
      console.log("🔍 Fetching pasabuyer name for:", pasabuyerId);
      const userDoc = await getDoc(doc(db, "users", pasabuyerId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const name = userData.displayName || userData.name || userData.email || "Pasabuyer";
        
        setPasabuyerNames(prev => ({
          ...prev,
          [pasabuyerId]: name
        }));
        
        console.log(`✅ Found pasabuyer name: ${name}`);
      } else {
        setPasabuyerNames(prev => ({
          ...prev,
          [pasabuyerId]: "Pasabuyer"
        }));
      }
    } catch (error) {
      console.log("❌ Error fetching pasabuyer name:", error);
      setPasabuyerNames(prev => ({
        ...prev,
        [pasabuyerId]: "Pasabuyer"
      }));
    }
  };

  // ENHANCED: Find the actual document location and update it
  const updateRequestStatus = async (requestId, updates) => {
    try {
      console.log(`🔍 Looking for request ${requestId} in all possible locations...`);
      
      // List of possible collections where the request might be stored
      const possibleLocations = [
        { collection: 'requests', path: `requests/${requestId}` },
        { collection: 'orders', path: `orders/${requestId}` },
        { collection: 'pasabuyRequests', path: `pasabuyRequests/${requestId}` },
        { collection: 'userRequests', path: `userRequests/${requestId}` },
        { collection: 'activeRequests', path: `activeRequests/${requestId}` },
        { collection: 'marketplace', path: `marketplace/${requestId}` }
      ];

      // Also check user subcollections
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      for (const userDoc of usersSnapshot.docs) {
        possibleLocations.push({
          collection: `users/${userDoc.id}/requests`,
          path: `users/${userDoc.id}/requests/${requestId}`
        });
      }

      let foundLocation = null;
      
      // Try each possible location
      for (const location of possibleLocations) {
        try {
          const docRef = doc(db, location.path.split('/')[0], ...location.path.split('/').slice(1));
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            foundLocation = location;
            console.log(`✅ Found request in: ${location.collection}`);
            break;
          }
        } catch (error) {
          // Collection or document might not exist, continue to next
          continue;
        }
      }

      if (foundLocation) {
        // Update the document in its actual location
        const docRef = doc(db, foundLocation.path.split('/')[0], ...foundLocation.path.split('/').slice(1));
        await updateDoc(docRef, {
          ...updates,
          updatedAt: serverTimestamp() // Always update timestamp
        });
        console.log(`✅ Successfully updated request in: ${foundLocation.collection}`);
        return true;
      } else {
        console.log("❌ Request not found in any location");
        return false;
      }

    } catch (error) {
      console.error("❌ Error updating request:", error);
      throw error;
    }
  };

  const fetchUserRequests = async (currentUserId) => {
    try {
      console.log("🔄 COMPREHENSIVE search for user requests...");
      setLoading(true);
      
      let allUserRequests = [];
      let debugMessages = [];

      // METHOD 1: Try different field names for user ID
      const possibleUserFields = ['userId', 'userID', 'user_id', 'user', 'owner', 'requesterId', 'createdBy'];
      
      for (const fieldName of possibleUserFields) {
        try {
          const requestsRef = collection(db, "requests");
          const q = query(requestsRef, where(fieldName, "==", currentUserId));
          const querySnapshot = await getDocs(q);
          
          console.log(`🔍 Field "${fieldName}": Found ${querySnapshot.size} requests`);
          
          querySnapshot.forEach((doc) => {
            const requestData = doc.data();
            const requestWithId = {
              id: doc.id,
              ...requestData,
              source: `field_${fieldName}`,
              collection: 'requests',
              createdAt: requestData.createdAt?.toDate?.() || new Date(),
              time: formatTimeAgo(requestData.createdAt?.toDate?.() || new Date())
            };
            
            allUserRequests.push(requestWithId);
            
            // Fetch pasabuyer name for accepted, delivered, and completed requests
            if (requestData.acceptedBy && (requestData.status === "accepted" || requestData.status === "delivered" || requestData.status === "completed")) {
              fetchPasabuyerName(requestData.acceptedBy);
            }
          });
          
          if (querySnapshot.size > 0) {
            debugMessages.push(`✅ Found ${querySnapshot.size} requests using field: ${fieldName}`);
          }
        } catch (error) {
          console.log(`❌ Query failed for field ${fieldName}:`, error.message);
        }
      }

      // METHOD 2: Get ALL requests and filter client-side
      try {
        const requestsRef = collection(db, "requests");
        const allRequestsSnapshot = await getDocs(requestsRef);
        
        console.log(`📊 Total requests in database: ${allRequestsSnapshot.size}`);
        
        const clientFilteredRequests = [];
        allRequestsSnapshot.forEach((doc) => {
          const requestData = doc.data();
          const requestWithId = {
            id: doc.id,
            ...requestData
          };
          
          // Check ALL possible user fields
          const isUserRequest = 
            requestData.userId === currentUserId ||
            requestData.userID === currentUserId ||
            requestData.user_id === currentUserId ||
            requestData.user === currentUserId ||
            requestData.owner === currentUserId ||
            requestData.requesterId === currentUserId ||
            requestData.createdBy === currentUserId;
          
          if (isUserRequest) {
            const enhancedRequest = {
              ...requestWithId,
              source: "client_filter",
              collection: 'requests',
              createdAt: requestData.createdAt?.toDate?.() || new Date(),
              time: formatTimeAgo(requestData.createdAt?.toDate?.() || new Date())
            };
            
            clientFilteredRequests.push(enhancedRequest);
            
            // Fetch pasabuyer name for accepted, delivered, and completed requests
            if (requestData.acceptedBy && (requestData.status === "accepted" || requestData.status === "delivered" || requestData.status === "completed")) {
              fetchPasabuyerName(requestData.acceptedBy);
            }
          }
        });
        
        console.log(`🔍 Client-side filtering found: ${clientFilteredRequests.length} requests`);
        allUserRequests = [...allUserRequests, ...clientFilteredRequests];
        
        if (clientFilteredRequests.length > 0) {
          debugMessages.push(`✅ Client-side found ${clientFilteredRequests.length} requests`);
        }
      } catch (error) {
        console.log("❌ Error in client-side filtering:", error);
      }

      // METHOD 3: Check user subcollections
      try {
        const userRequestsRef = collection(db, "users", currentUserId, "requests");
        const userRequestsSnapshot = await getDocs(userRequestsRef);
        
        console.log(`👤 User subcollection requests: ${userRequestsSnapshot.size}`);
        
        userRequestsSnapshot.forEach((doc) => {
          const requestData = doc.data();
          const enhancedRequest = {
            id: doc.id,
            ...requestData,
            source: "user_subcollection",
            collection: `users/${currentUserId}/requests`,
            createdAt: requestData.createdAt?.toDate?.() || new Date(),
            time: formatTimeAgo(requestData.createdAt?.toDate?.() || new Date())
          };
          
          allUserRequests.push(enhancedRequest);
          
          // Fetch pasabuyer name for accepted, delivered, and completed requests
          if (requestData.acceptedBy && (requestData.status === "accepted" || requestData.status === "delivered" || requestData.status === "completed")) {
            fetchPasabuyerName(requestData.acceptedBy);
          }
        });
        
        if (userRequestsSnapshot.size > 0) {
          debugMessages.push(`✅ User subcollection found ${userRequestsSnapshot.size} requests`);
        }
      } catch (error) {
        console.log("❌ User subcollection not accessible:", error.message);
      }

      // Remove duplicates by ID
      const uniqueRequests = allUserRequests.filter((request, index, self) => 
        index === self.findIndex(r => r.id === request.id)
      );

      console.log(`🎯 FINAL: ${uniqueRequests.length} unique user requests found`);
      
      // Debug: Show all statuses found
      const statusCounts = {};
      uniqueRequests.forEach(req => {
        const status = req.status || 'undefined';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log("📊 Status counts:", statusCounts);
      
      const debugText = `Search Results: ${uniqueRequests.length} requests found\n${debugMessages.join('\n')}\nStatus Counts: ${JSON.stringify(statusCounts)}`;
      setDebugInfo(debugText);
      
      setRequests(uniqueRequests);
      setLoading(false);

    } catch (error) {
      console.error("❌ Error in fetchUserRequests:", error);
      setLoading(false);
    }
  };

  // ENHANCED: Handle Message Pasabuyer - creates proper chat and redirects
  const handleMessagePasabuyer = async (request) => {
    try {
      if (!userId || !request.acceptedBy) {
        alert("Cannot message pasabuyer at this time.");
        return;
      }

      console.log("💬 Creating chat with pasabuyer:", request.acceptedBy);
      
      // Create consistent chat ID (same format as pasabuyer side)
      const chatId = `${request.acceptedBy}_${userId}_${request.id}`;
      console.log(`🔍 Chat ID: ${chatId}`);

      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      if (chatSnap.exists()) {
        console.log("✅ Chat exists, redirecting...");
        navigate('/chat', { state: { openChatId: chatId } });
      } else {
        console.log("❌ Chat not found, creating new one...");
        
        // Get requester info
        const requesterDoc = await getDoc(doc(db, "users", userId));
        const requesterData = requesterDoc.exists() ? requesterDoc.data() : {};
        const requesterName = requesterData.displayName || requesterData.name || "Requester";
        
        // Get pasabuyer info
        const pasabuyerDoc = await getDoc(doc(db, "users", request.acceptedBy));
        const pasabuyerData = pasabuyerDoc.exists() ? pasabuyerDoc.data() : {};
        const pasabuyerName = pasabuyerData.displayName || pasabuyerData.name || "Pasabuyer";

        // Create chat data
        const chatData = {
          id: chatId,
          participants: [request.acceptedBy, userId],
          participantNames: {
            [request.acceptedBy]: pasabuyerName,
            [userId]: requesterName
          },
          participantAvatars: {
            [request.acceptedBy]: pasabuyerData.photoURL || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            [userId]: requesterData.photoURL || "https://cdn-icons-png.flaticon.com/512/706/706830.png"
          },
          requestId: request.id,
          requestDetails: {
            title: request.title || request.itemName || "Item",
            store: request.storeLocation || "Store",
            deliveryLocation: request.deliveryLocation || "Location",
            items: [request.title || request.itemName || "Item"],
            quantity: request.quantity || 1,
            budget: request.price || request.budget || 0,
            totalPrice: request.price || request.budget || 0,
            status: request.status || "accepted"
          },
          lastMessage: "Hello! I have a question about my order.",
          lastUpdated: serverTimestamp(),
          createdAt: serverTimestamp(),
          messages: [{
            id: `msg_${Date.now()}`,
            senderId: userId,
            text: "Hello! I have a question about my order.",
            timestamp: new Date(),
            status: 'sent'
          }]
        };

        console.log("💾 Saving chat data:", chatData);
        await setDoc(chatRef, chatData);
        console.log("✅ New chat created successfully");

        navigate('/chat', { state: { openChatId: chatId } });
      }

    } catch (error) {
      console.error("❌ Error in handleMessagePasabuyer:", error);
      alert("Failed to open chat: " + error.message);
    }
  };

  // ENHANCED: Cancel/Delete active request
  const handleCancelRequest = async (request) => {
    try {
      if (!window.confirm("Are you sure you want to cancel this request? This action cannot be undone.")) {
        return;
      }

      console.log("🗑️ Cancelling request:", request.id);
      
      const updates = {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        cancellationReason: "Cancelled by requester"
      };

      const success = await updateRequestStatus(request.id, updates);

      if (success) {
        console.log("✅ Request cancelled successfully");
        alert("✅ Your request has been cancelled.");

        setRequests(prevRequests => 
          prevRequests.map(req => 
            req.id === request.id 
              ? { ...req, status: "cancelled" }
              : req
          )
        );
      } else {
        console.log("⚠️ Could not find document, updating local state only");
        alert("⚠️ Request cancelled locally, but couldn't update in database.");
        
        setRequests(prevRequests => 
          prevRequests.map(req => 
            req.id === request.id 
              ? { ...req, status: "cancelled" }
              : req
          )
        );
      }

    } catch (error) {
      console.error("❌ Error cancelling request:", error);
      alert("Failed to cancel request: " + error.message);
    }
  };

  // ENHANCED: Handle Confirm Receipt - with better synchronization
  const handleConfirmReceipt = async (request) => {
    try {
      if (!window.confirm("Are you sure you have received the item? This will complete the order and release payment to the pasabuyer.")) {
        return;
      }

      console.log("✅ Confirming receipt for request:", request.id);
      
      const updates = {
        status: "completed",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        confirmedBy: userId
      };

      const success = await updateRequestStatus(request.id, updates);

      if (success) {
        console.log("✅ Receipt confirmed - order completed!");
        alert("✅ Thank you for confirming! The order is now completed.");

        // Update local state immediately
        setRequests(prevRequests => 
          prevRequests.map(req => 
            req.id === request.id 
              ? { ...req, status: "completed" }
              : req
          )
        );

        // Show success message with details
        setTimeout(() => {
          alert(`🎉 Order Completed Successfully!\n\nItem: ${request.title || "Your item"}\nPasabuyer: ${getPasabuyerName(request.acceptedBy)}\nThank you for using Pasabuy!`);
        }, 500);

      } else {
        alert("⚠️ Confirmation saved locally, but couldn't update in database.");
        
        setRequests(prevRequests => 
          prevRequests.map(req => 
            req.id === request.id 
              ? { ...req, status: "completed" }
              : req
          )
        );
      }

    } catch (error) {
      console.error("❌ Error confirming receipt:", error);
      alert("Failed to confirm receipt: " + error.message);
    }
  };

  // ENHANCED: Handle Report Issue
  const handleReportIssue = async (request) => {
    try {
      const issue = prompt("Please describe the issue with your delivery:");
      if (!issue) return;

      const updates = {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        cancellationReason: `Issue reported by requester: ${issue}`,
        reportedBy: userId
      };

      const success = await updateRequestStatus(request.id, updates);

      if (success) {
        alert("✅ Issue reported. The order has been cancelled.");
      } else {
        alert("⚠️ Issue reported locally, but couldn't update in database.");
      }

      setRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === request.id 
            ? { ...req, status: "cancelled" }
            : req
        )
      );

    } catch (error) {
      console.error("❌ Error reporting issue:", error);
      alert("Failed to report issue: " + error.message);
    }
  };

  // Show ALL database data for debugging
  const showAllDatabaseData = async () => {
    try {
      console.log("=== 🗃️ SHOWING ALL DATABASE DATA ===");
      
      const requestsRef = collection(db, "requests");
      const querySnapshot = await getDocs(requestsRef);
      
      const allData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        allData.push({
          id: doc.id,
          ...data,
          allFields: Object.keys(data),
          fieldValues: data
        });
      });

      console.log("📋 ALL REQUESTS IN DATABASE:", allData);
      
      let alertMessage = `Total Requests in Database: ${allData.length}\n\n`;
      allData.forEach((item, index) => {
        alertMessage += `--- Request ${index + 1} ---\n`;
        alertMessage += `ID: ${item.id}\n`;
        alertMessage += `Status: ${item.status}\n`;
        alertMessage += `User ID: ${item.userId}\n`;
        alertMessage += `Current User: ${userId}\n`;
        alertMessage += `Is Mine: ${item.userId === userId}\n`;
        alertMessage += `Accepted By: ${item.acceptedBy}\n`;
        alertMessage += `All Fields: ${item.allFields.join(', ')}\n\n`;
      });

      if (alertMessage.length > 2000) {
        alert(alertMessage.substring(0, 2000) + "\n\n... (see console for full data)");
      } else {
        alert(alertMessage);
      }

    } catch (error) {
      console.error("❌ Error showing database data:", error);
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const actualDate = date?.toDate ? date.toDate() : new Date(date);
    const diffInSeconds = Math.floor((now - actualDate) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const formatPrice = (price) => {
    return `₱${price?.toLocaleString() || '0'}`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      Active: { text: 'Active', color: '#17a2b8', icon: <FiClock /> },
      active: { text: 'Active', color: '#17a2b8', icon: <FiClock /> },
      accepted: { text: 'Accepted', color: '#ffc107', icon: <FiPackage /> },
      delivered: { text: 'Delivered', color: '#fd7e14', icon: <FiTruck /> },
      completed: { text: 'Completed', color: '#28a745', icon: <FiCheck /> },
      cancelled: { text: 'Cancelled', color: '#dc3545', icon: <FiX /> }
    };
    
    const config = statusConfig[status] || statusConfig.Active;
    
    return (
      <span className="status-badge" style={{ backgroundColor: config.color }}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  // Get pasabuyer display name
  const getPasabuyerName = (acceptedBy) => {
    if (!acceptedBy) return "Pasabuyer";
    return pasabuyerNames[acceptedBy] || "Pasabuyer";
  };

  // FIXED: Proper filtering logic with better debugging
  const filteredRequests = requests.filter(request => {
    const actualStatus = request.status;
    const normalizedStatus = (actualStatus || '').toLowerCase().trim();
    const hasAcceptedBy = !!request.acceptedBy;

    console.log(`🔍 Filtering: ID=${request.id}, Status="${actualStatus}", Normalized="${normalizedStatus}", AcceptedBy=${hasAcceptedBy}`);

    switch (activeTab) {
      case "active":
        // Active requests: not accepted, not completed, not cancelled, not delivered
        const isActive = 
          normalizedStatus === "active" || 
          actualStatus === "Active" ||
          normalizedStatus === "pending" || 
          normalizedStatus === "open" ||
          normalizedStatus === "available" ||
          // No status but also no acceptedBy (new requests)
          (!actualStatus && !hasAcceptedBy) ||
          // Default case for new requests without explicit status
          (normalizedStatus === "" && !hasAcceptedBy);
        
        console.log(`   Active: ${isActive}`);
        return isActive;
      
      case "accepted":
        // Accepted requests: has acceptedBy and status is accepted
        const isAccepted = 
          normalizedStatus === "accepted" || 
          normalizedStatus === "approved" || 
          normalizedStatus === "taken" ||
          normalizedStatus === "in progress" ||
          // Has acceptedBy but not in other states
          (hasAcceptedBy && 
           normalizedStatus !== "completed" && 
           normalizedStatus !== "delivered" && 
           normalizedStatus !== "cancelled" &&
           normalizedStatus !== "finished");
        
        console.log(`   Accepted: ${isAccepted}`);
        return isAccepted;
      
      case "delivered":
        // FIXED: Delivered requests - should show confirm receipt button
        const isDelivered = 
          normalizedStatus === "delivered" || 
          normalizedStatus === "shipped" || 
          normalizedStatus === "out for delivery" ||
          normalizedStatus === "ready for pickup";
        console.log(`   Delivered: ${isDelivered}`);
        return isDelivered;
      
      case "completed":
        const isCompleted = 
          normalizedStatus === "completed" || 
          normalizedStatus === "finished" || 
          normalizedStatus === "done" ||
          normalizedStatus === "fulfilled" ||
          normalizedStatus === "closed";
        console.log(`   Completed: ${isCompleted}`);
        return isCompleted;
      
      case "cancelled":
        const isCancelled = 
          normalizedStatus === "cancelled" || 
          normalizedStatus === "canceled" || 
          normalizedStatus === "rejected" ||
          normalizedStatus === "declined" ||
          normalizedStatus === "failed";
        console.log(`   Cancelled: ${isCancelled}`);
        return isCancelled;
      
      default:
        return true;
    }
  });

  const getTabCount = (tab) => {
    switch (tab) {
      case "active":
        return requests.filter(req => {
          const status = (req.status || '').toLowerCase();
          return (status === "active" || status === "pending" || status === "open" || status === "available") && !req.acceptedBy;
        }).length;
      case "accepted":
        return requests.filter(req => {
          const status = (req.status || '').toLowerCase();
          return (status === "accepted" || status === "approved" || status === "taken" || status === "in progress") && req.acceptedBy;
        }).length;
      case "delivered":
        return requests.filter(req => {
          const status = (req.status || '').toLowerCase();
          return status === "delivered" || status === "shipped" || status === "out for delivery";
        }).length;
      case "completed":
        return requests.filter(req => {
          const status = (req.status || '').toLowerCase();
          return status === "completed" || status === "finished" || status === "done";
        }).length;
      case "cancelled":
        return requests.filter(req => {
          const status = (req.status || '').toLowerCase();
          return status === "cancelled" || status === "canceled" || status === "rejected";
        }).length;
      default:
        return 0;
    }
  };

  const handleRefresh = () => {
    if (userId) {
      setLoading(true);
      fetchUserRequests(userId);
    }
  };

  // FIXED: Render action buttons based on status
  const renderActionButtons = (request) => {
    const normalizedStatus = (request.status || '').toLowerCase();
    
    console.log(`🎯 Rendering buttons for request ${request.id} with status: ${normalizedStatus}`);
    
    switch (normalizedStatus) {
      case "active":
        return (
          <div className="action-buttons">
            <button 
              className="cancel-btn"
              onClick={() => handleCancelRequest(request)}
            >
              <FiX className="btn-icon" />
              Cancel Request
            </button>
            <p className="status-info">⏳ Waiting for a Pasabuyer to accept your request</p>
          </div>
        );
      
      case "accepted":
        return (
          <div className="action-buttons">
            <button 
              className="chat-btn"
              onClick={() => handleMessagePasabuyer(request)}
            >
              <FiMessageCircle className="btn-icon" />
              Message {getPasabuyerName(request.acceptedBy)}
            </button>
            <p className="status-info">🚀 Your request has been accepted by {getPasabuyerName(request.acceptedBy)}!</p>
          </div>
        );
      
      case "delivered":
        return (
          <div className="action-buttons delivered-actions">
            <div className="delivery-buttons">
              <button 
                className="confirm-btn"
                onClick={() => handleConfirmReceipt(request)}
              >
                <FiCheck className="btn-icon" />
                Confirm Receipt
              </button>
              <button 
                className="issue-btn"
                onClick={() => handleReportIssue(request)}
              >
                <FiX className="btn-icon" />
                Report Issue
              </button>
            </div>
            <button 
              className="chat-btn"
              onClick={() => handleMessagePasabuyer(request)}
            >
              <FiMessageCircle className="btn-icon" />
              Message {getPasabuyerName(request.acceptedBy)}
            </button>
            <p className="status-info">📦 Item has been delivered by {getPasabuyerName(request.acceptedBy)}. Please confirm receipt to complete the order.</p>
          </div>
        );
      
      case "completed":
        return (
          <div className="completed-section">
            <p className="status-success">✅ Request completed successfully with {getPasabuyerName(request.acceptedBy)}!</p>
            <button 
              className="chat-btn"
              onClick={() => handleMessagePasabuyer(request)}
            >
              <FiMessageCircle className="btn-icon" />
              Message {getPasabuyerName(request.acceptedBy)}
            </button>
          </div>
        );
      
      case "cancelled":
        return (
          <p className="status-cancelled">❌ Request has been cancelled</p>
        );
      
      default:
        // For requests without explicit status but with acceptedBy
        if (request.acceptedBy) {
          return (
            <div className="action-buttons">
              <button 
                className="chat-btn"
                onClick={() => handleMessagePasabuyer(request)}
              >
                <FiMessageCircle className="btn-icon" />
                Message {getPasabuyerName(request.acceptedBy)}
              </button>
              <p className="status-info">🚀 Your request has been accepted by {getPasabuyerName(request.acceptedBy)}!</p>
            </div>
          );
        }
        return (
          <div className="action-buttons">
            <button 
              className="cancel-btn"
              onClick={() => handleCancelRequest(request)}
            >
              <FiX className="btn-icon" />
              Cancel Request
            </button>
            <p className="status-info">⏳ Waiting for a Pasabuyer to accept your request</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="my-requests-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading your requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-requests-container">
      <header className="requests-header">
        <div className="header-left">
          <button className="exit-circle" onClick={() => navigate("/")}>
            <FiArrowLeft className="exit-icon" />
          </button>
          <div className="header-text">
            <h2>My Pasabuy Requests</h2>
            <p>Track the status of your requested items</p>
          </div>
        </div>
      </header>

      {/* Status Flow Information */}
      <div className="flow-info">
        <div className="flow-steps">
          <div className={`flow-step ${activeTab === "active" ? "active" : ""}`}>
            <FiClock />
            <span>Active</span>
          </div>
          <div className="flow-arrow">→</div>
          <div className={`flow-step ${activeTab === "accepted" ? "active" : ""}`}>
            <FiPackage />
            <span>Accepted</span>
          </div>
          <div className="flow-arrow">→</div>
          <div className={`flow-step ${activeTab === "delivered" ? "active" : ""}`}>
            <FiTruck />
            <span>Delivered</span>
          </div>
          <div className="flow-arrow">→</div>
          <div className={`flow-step ${activeTab === "completed" ? "active" : ""}`}>
            <FiCheck />
            <span>Completed</span>
          </div>
        </div>
        <p className="flow-description">
          {activeTab === "active" && "Your request is waiting for a pasabuyer to accept it"}
          {activeTab === "accepted" && "A pasabuyer has accepted your request"}
          {activeTab === "delivered" && "Item has been delivered - please confirm receipt"}
          {activeTab === "completed" && "Order successfully completed"}
        </p>
      </div>


      <div className="requests-tabs">
        <button 
          className={`tab ${activeTab === "active" ? "active" : ""}`}
          onClick={() => setActiveTab("active")}
        >
          <FiClock className="tab-icon" />
          Active
          <span className="tab-count">
            {getTabCount("active")}
          </span>
        </button>
        
        <button 
          className={`tab ${activeTab === "accepted" ? "active" : ""}`}
          onClick={() => setActiveTab("accepted")}
        >
          <FiPackage className="tab-icon" />
          Accepted
          <span className="tab-count">
            {getTabCount("accepted")}
          </span>
        </button>

        <button 
          className={`tab ${activeTab === "delivered" ? "active" : ""}`}
          onClick={() => setActiveTab("delivered")}
        >
          <FiTruck className="tab-icon" />
          Delivered
          <span className="tab-count">
            {getTabCount("delivered")}
          </span>
        </button>
        
        <button 
          className={`tab ${activeTab === "completed" ? "active" : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          <FiCheck className="tab-icon" />
          Completed
          <span className="tab-count">
            {getTabCount("completed")}
          </span>
        </button>
        
        <button 
          className={`tab ${activeTab === "cancelled" ? "active" : ""}`}
          onClick={() => setActiveTab("cancelled")}
        >
          <FiX className="tab-icon" />
          Cancelled
          <span className="tab-count">
            {getTabCount("cancelled")}
          </span>
        </button>
      </div>

      <div className="requests-list">
        {filteredRequests.length === 0 ? (
          <div className="no-requests">
            <FiPackage className="no-requests-icon" />
            <h3>No requests found</h3>
            <p>
              {activeTab === "active" 
                ? "You don't have any active requests yet." 
                : activeTab === "accepted"
                ? "No accepted requests yet."
                : activeTab === "delivered"
                ? "No delivered requests waiting for confirmation."
                : activeTab === "completed"
                ? "No completed requests yet."
                : "No cancelled requests."
              }
            </p>
            <button className="refresh-btn-small" onClick={handleRefresh}>
              <FiClock className="refresh-icon" />
              Check Again
            </button>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <div className="request-info">
                  <h4>{request.title || "Untitled Request"}</h4>
                  {getStatusBadge(request.status)}
                </div>
                <span className="request-time">{request.time}</span>
              </div>

              <div className="request-details">
                <div className="detail-row">
                  <span className="detail-label">Store:</span>
                  <span className="detail-value">{request.storeLocation || "Not specified"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Budget:</span>
                  <span className="detail-value">{formatPrice(request.price || request.budget || 0)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Quantity:</span>
                  <span className="detail-value">{request.quantity || 1}</span>
                </div>
                {request.acceptedBy && (
                  <div className="detail-row">
                    <FiUser className="detail-icon" />
                    <span className="detail-label">Accepted by:</span>
                    <span className="detail-value">{getPasabuyerName(request.acceptedBy)}</span>
                  </div>
                )}
              </div>

              <div className="request-actions">
                {renderActionButtons(request)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyPasabuyRequests;