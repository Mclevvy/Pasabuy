import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiPackage, FiCheck, FiX, FiClock, FiRefreshCw, FiMessageCircle, FiTruck, FiUser, FiMapPin, FiDollarSign, FiShoppingCart } from "react-icons/fi";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  setDoc,
  getDoc
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import "./PasabuyerHistory.css";

const PasabuyerHistory = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [activeTab, setActiveTab] = useState("to_deliver");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
        console.log("👤 Current User ID:", currentUser.uid);
        
        // Set up real-time listener first
        setupRealTimeListener(currentUser.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // SINGLE SOURCE OF TRUTH: Real-time listener only
  const setupRealTimeListener = (currentUserId) => {
    console.log("👂 Setting up SINGLE real-time listener...");
    setLoading(true);

    const requestsRef = collection(db, "requests");
    const unsubscribe = onSnapshot(requestsRef, async (snapshot) => {
      console.log("🔄 Real-time update received!");
      
      const realTimeOrders = [];
      
      // Process all documents from real-time listener
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.acceptedBy === currentUserId) {
          
          // ENHANCE: Try to get additional data if needed
          let enhancedData = { ...data };
          
          // If basic data, try to enhance it
          if (!data.itemName || !data.storeLocation) {
            try {
              const enhancedOrder = await enhanceOrderData(doc.id, data);
              enhancedData = { ...enhancedData, ...enhancedOrder };
            } catch (error) {
              console.log("⚠️ Could not enhance order data, using basic data");
            }
          }

          const order = {
            id: doc.id,
            collection: 'requests',
            ...enhancedData,
            // Apply consistent fallbacks
            itemName: enhancedData.itemName || enhancedData.title || enhancedData.productName || "Order #" + doc.id.substring(0, 8),
            price: enhancedData.price || enhancedData.budget || enhancedData.cost || 100,
            storeLocation: enhancedData.storeLocation || enhancedData.store || "Store Location",
            deliveryLocation: enhancedData.deliveryLocation || enhancedData.deliveryAddress || "Delivery Location",
            quantity: enhancedData.quantity || 1,
            requesterName: enhancedData.requesterName || enhancedData.userName || enhancedData.user || "Customer",
            userId: enhancedData.userId || enhancedData.userID || enhancedData.user_id || enhancedData.user || enhancedData.owner || enhancedData.requesterId || enhancedData.createdBy,
            // Timestamps
            createdAt: enhancedData.createdAt?.toDate?.() || new Date(),
            acceptedAt: enhancedData.acceptedAt?.toDate?.() || new Date(),
            // Calculated fields
            time: formatTimeAgo(enhancedData.acceptedAt?.toDate?.() || new Date()),
            totalPrice: enhancedData.price || enhancedData.budget || enhancedData.cost || 100,
            estimatedEarnings: Math.max(50, Math.round((enhancedData.price || enhancedData.budget || enhancedData.cost || 100) * 0.07))
          };

          realTimeOrders.push(order);
        }
      }

      console.log(`🎯 REAL-TIME: ${realTimeOrders.length} orders found`);
      
      // Remove duplicates by ID and sort
      const uniqueOrders = realTimeOrders.reduce((acc, current) => {
        const existing = acc.find(order => order.id === current.id);
        if (!existing) {
          acc.push(current);
        } else {
          // If duplicate, keep the one with more complete data
          const currentDataScore = calculateDataCompleteness(current);
          const existingDataScore = calculateDataCompleteness(existing);
          
          if (currentDataScore > existingDataScore) {
            acc = acc.filter(order => order.id !== current.id);
            acc.push(current);
          }
        }
        return acc;
      }, []);

      // Sort by date
      const sortedOrders = uniqueOrders.sort((a, b) => {
        const dateA = a.acceptedAt?.getTime?.() || 0;
        const dateB = b.acceptedAt?.getTime?.() || 0;
        return dateB - dateA;
      });

      console.log(`✅ FINAL: ${sortedOrders.length} unique orders`);
      setOrders(sortedOrders);
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  };

  // ENHANCED: Handle Refresh with better UX
  const handleRefresh = async () => {
    if (userId) {
      setRefreshing(true);
      setLastRefresh(new Date());
      
      // Show refreshing state for at least 1 second for better UX
      setTimeout(() => {
        setRefreshing(false);
      }, 1000);
      
      console.log("🔄 Manual refresh triggered");
    }
  };

  // Helper function to enhance basic order data
  const enhanceOrderData = async (orderId, basicData) => {
    try {
      console.log(`🔍 Enhancing data for order: ${orderId}`);
      
      const possibleCollections = [
        'pasabuyRequests',
        'userRequests', 
        'activeRequests',
        'marketplace',
        'orders'
      ];

      for (const collectionName of possibleCollections) {
        try {
          const docRef = doc(db, collectionName, orderId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const enhancedData = docSnap.data();
            console.log(`✅ Found enhanced data in: ${collectionName}`);
            return enhancedData;
          }
        } catch (error) {
          continue;
        }
      }

      // If no enhanced data found, try user subcollections
      if (basicData.userId) {
        try {
          const userRequestRef = doc(db, "users", basicData.userId, "requests", orderId);
          const userRequestSnap = await getDoc(userRequestRef);
          
          if (userRequestSnap.exists()) {
            console.log("✅ Found enhanced data in user requests");
            return userRequestSnap.data();
          }
        } catch (error) {
          // User subcollection might not exist
        }
      }

      return basicData; // Return original data if no enhancement found
    } catch (error) {
      console.log("❌ Error enhancing order data:", error);
      return basicData;
    }
  };

  // Helper to calculate data completeness score
  const calculateDataCompleteness = (order) => {
    let score = 0;
    if (order.itemName && order.itemName !== "Order") score += 10;
    if (order.storeLocation && order.storeLocation !== "Store Location") score += 10;
    if (order.deliveryLocation && order.deliveryLocation !== "Delivery Location") score += 10;
    if (order.requesterName && order.requesterName !== "Customer") score += 10;
    if (order.price && order.price > 100) score += 10;
    if (order.description) score += 5;
    if (order.contactNumber) score += 5;
    return score;
  };

  // ENHANCED: Function to update request status in any location
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

  // Handle Message Requester
  const handleMessageRequester = async (order) => {
    try {
      if (!userId || !order.userId) {
        alert("Cannot message requester at this time.");
        return;
      }

      console.log("💬 Creating chat with requester:", order.userId);
      
      // Create consistent chat ID (same format as requester side)
      const chatId = `${userId}_${order.userId}_${order.id}`;
      console.log(`🔍 Chat ID: ${chatId}`);

      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      if (chatSnap.exists()) {
        console.log("✅ Chat exists, redirecting...");
        navigate('/chat', { state: { openChatId: chatId } });
      } else {
        console.log("❌ Chat not found, creating new one...");
        
        // Get requester info
        const requesterDoc = await getDoc(doc(db, "users", order.userId));
        const requesterData = requesterDoc.exists() ? requesterDoc.data() : {};
        const requesterName = requesterData.displayName || requesterData.name || order.requesterName || "Requester";
        
        // Get pasabuyer info
        const pasabuyerDoc = await getDoc(doc(db, "users", userId));
        const pasabuyerData = pasabuyerDoc.exists() ? pasabuyerDoc.data() : {};
        const pasabuyerName = pasabuyerData.displayName || pasabuyerData.name || "Pasabuyer";

        // Create chat data
        const chatData = {
          id: chatId,
          participants: [userId, order.userId],
          participantNames: {
            [userId]: pasabuyerName,
            [order.userId]: requesterName
          },
          participantAvatars: {
            [userId]: pasabuyerData.photoURL || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            [order.userId]: requesterData.photoURL || "https://cdn-icons-png.flaticon.com/512/706/706830.png"
          },
          requestId: order.id,
          requestDetails: {
            title: order.itemName,
            store: order.storeLocation,
            deliveryLocation: order.deliveryLocation,
            items: [order.itemName],
            quantity: order.quantity,
            budget: order.price,
            totalPrice: order.totalPrice,
            status: order.status
          },
          lastMessage: "Magandang araw",
          lastUpdated: serverTimestamp(),
          createdAt: serverTimestamp(),
          messages: [{
            id: `msg_${Date.now()}`,
            senderId: userId,
            text: "Magandang araw",
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
      console.error("❌ Error in handleMessageRequester:", error);
      alert("Failed to open chat: " + error.message);
    }
  };

  // ENHANCED: Handle Mark as Delivered - updates status to "delivered"
  const handleMarkAsDelivered = async (order) => {
    try {
      if (!window.confirm("Are you sure you have delivered this item? The requester will need to confirm receipt before the order is completed.")) {
        return;
      }

      console.log("🚚 Marking order as delivered:", order.id);
      
      const updates = {
        status: "delivered",
        deliveredAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const success = await updateRequestStatus(order.id, updates);

      if (success) {
        console.log("✅ Order marked as delivered - waiting for requester confirmation");
        alert("✅ Order marked as delivered! Waiting for requester confirmation.");

        // Update local state
        setOrders(prevOrders => 
          prevOrders.map(o => 
            o.id === order.id 
              ? { ...o, status: "delivered" }
              : o
          )
        );
      } else {
        console.log("⚠️ Could not find document, updating local state only");
        alert("⚠️ Status updated locally, but couldn't update in database.");
        
        setOrders(prevOrders => 
          prevOrders.map(o => 
            o.id === order.id 
              ? { ...o, status: "delivered" }
              : o
          )
        );
      }

    } catch (error) {
      console.error("❌ Error in handleMarkAsDelivered:", error);
      alert("Failed to mark as delivered: " + error.message);
    }
  };

  // ENHANCED: Handle Cancel Order
  const handleCancelOrder = async (order) => {
    try {
      if (!window.confirm("Are you sure you want to cancel this order?")) {
        return;
      }

      console.log("🗑️ Cancelling order:", order.id);
      
      const updates = {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        cancelledBy: userId,
        cancellationReason: "Cancelled by pasabuyer"
      };

      const success = await updateRequestStatus(order.id, updates);

      if (success) {
        alert("✅ Order cancelled!");
      } else {
        alert("⚠️ Order cancelled locally, but couldn't update in database.");
      }

      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === order.id ? { ...o, status: "cancelled" } : o
        )
      );

    } catch (error) {
      console.error("❌ Error in handleCancelOrder:", error);
      alert("Failed to cancel order: " + error.message);
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
      accepted: { text: 'To Deliver', color: '#ffc107', icon: <FiPackage /> },
      delivered: { text: 'Delivered', color: '#fd7e14', icon: <FiTruck /> },
      completed: { text: 'Completed', color: '#28a745', icon: <FiCheck /> },
      cancelled: { text: 'Cancelled', color: '#dc3545', icon: <FiX /> }
    };
    
    const config = statusConfig[status] || { text: 'Active', color: '#17a2b8', icon: <FiClock /> };
    
    return (
      <span className="status-badge" style={{ backgroundColor: config.color }}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  // Filter orders by status
  const filteredOrders = orders.filter(order => {
    switch (activeTab) {
      case "to_deliver":
        return order.status === "accepted";
      case "delivered":
        return order.status === "delivered";
      case "completed":
        return order.status === "completed";
      case "cancelled":
        return order.status === "cancelled";
      default:
        return true;
    }
  });

  const getTabCount = (tab) => {
    switch (tab) {
      case "to_deliver":
        return orders.filter(order => order.status === "accepted").length;
      case "delivered":
        return orders.filter(order => order.status === "delivered").length;
      case "completed":
        return orders.filter(order => order.status === "completed").length;
      case "cancelled":
        return orders.filter(order => order.status === "cancelled").length;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="pasabuyer-history-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pasabuyer-history-container">
      <header className="history-header">
        <div className="header-left">
          <button className="exit-circle" onClick={() => navigate("/home")}>
            <FiArrowLeft className="exit-icon" />
          </button>
          <div className="header-text">
            <h2>Pasabuy History</h2>
            <p>Track and manage your accepted orders</p>
            <span className="last-refresh">
              Last updated: {formatTimeAgo(lastRefresh)}
            </span>
          </div>
        </div>
        
        <button 
          className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <FiRefreshCw className={`refresh-icon ${refreshing ? 'spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {/* Status Flow Information */}
      <div className="flow-info">
        <div className="flow-steps">
          <div className={`flow-step ${activeTab === "to_deliver" ? "active" : ""}`}>
            <FiPackage />
            <span>To Deliver</span>
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
          {activeTab === "to_deliver" && "Mark orders as delivered when you've completed the delivery"}
          {activeTab === "delivered" && "Waiting for requester to confirm receipt"}
          {activeTab === "completed" && "Orders successfully completed and paid"}
        </p>
      </div>

      <div className="history-tabs">
        <button 
          className={`tab ${activeTab === "to_deliver" ? "active" : ""}`}
          onClick={() => setActiveTab("to_deliver")}
        >
          <FiPackage className="tab-icon" />
          To Deliver
          <span className="tab-count">
            {getTabCount("to_deliver")}
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

      <div className="orders-list">
        {filteredOrders.length === 0 ? (
          <div className="no-orders">
            <FiPackage className="no-orders-icon" />
            <h3>No orders found</h3>
            <p>
              {activeTab === "to_deliver" 
                ? "You don't have any orders to deliver yet." 
                : activeTab === "delivered"
                ? "No delivered orders waiting for confirmation."
                : activeTab === "completed"
                ? "No completed orders yet."
                : "No cancelled orders."
              }
            </p>
            <button 
              className={`refresh-btn-small ${refreshing ? 'refreshing' : ''}`}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <FiRefreshCw className={`refresh-icon ${refreshing ? 'spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Check Again'}
            </button>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <h4>{order.itemName}</h4>
                  {getStatusBadge(order.status)}
                </div>
                <span className="order-time">{order.time}</span>
              </div>

              <div className="order-details">
                <div className="detail-row">
                  <FiShoppingCart className="detail-icon" />
                  <span className="detail-label">Item:</span>
                  <span className="detail-value">{order.itemName}</span>
                </div>
                
                <div className="detail-row">
                  <FiPackage className="detail-icon" />
                  <span className="detail-label">Quantity:</span>
                  <span className="detail-value">{order.quantity} pcs</span>
                </div>

                <div className="detail-row">
                  <FiMapPin className="detail-icon" />
                  <span className="detail-label">Store:</span>
                  <span className="detail-value">{order.storeLocation}</span>
                </div>

                <div className="detail-row">
                  <FiMapPin className="detail-icon" />
                  <span className="detail-label">Delivery To:</span>
                  <span className="detail-value">{order.deliveryLocation}</span>
                </div>

                <div className="detail-row">
                  <FiDollarSign className="detail-icon" />
                  <span className="detail-label">Price:</span>
                  <span className="detail-value">{formatPrice(order.price)}</span>
                </div>

                <div className="detail-row">
                  <FiUser className="detail-icon" />
                  <span className="detail-label">Requester:</span>
                  <span className="detail-value">{order.requesterName}</span>
                </div>

                <div className="detail-row earnings-row">
                  <span className="detail-label">Your Earnings:</span>
                  <span className="detail-value earnings">
                    {formatPrice(order.estimatedEarnings)}
                  </span>
                </div>
              </div>

              {/* Action buttons for different statuses */}
              <div className="order-actions">
                {order.status === "accepted" && (
                  <>
                    <button 
                      className="chat-btn"
                      onClick={() => handleMessageRequester(order)}
                    >
                      <FiMessageCircle className="btn-icon" />
                      Message
                    </button>
                    <button 
                      className="deliver-btn"
                      onClick={() => handleMarkAsDelivered(order)}
                    >
                      <FiTruck className="btn-icon" />
                      Mark as Delivered
                    </button>
                    <button 
                      className="cancel-btn"
                      onClick={() => handleCancelOrder(order)}
                    >
                      <FiX className="btn-icon" />
                      Cancel
                    </button>
                  </>
                )}
                
                {order.status === "delivered" && (
                  <>
                    <button 
                      className="chat-btn"
                      onClick={() => handleMessageRequester(order)}
                    >
                      <FiMessageCircle className="btn-icon" />
                      Message Requester
                    </button>
                    <p className="status-info">
                      📦 Waiting for requester confirmation. The requester needs to confirm receipt in their "Delivered" tab.
                    </p>
                  </>
                )}
                
                {order.status === "completed" && (
                  <div className="completed-section">
                    <p className="status-success">
                      ✅ Order completed successfully! Payment has been processed.
                    </p>
                    <button 
                      className="chat-btn"
                      onClick={() => handleMessageRequester(order)}
                    >
                      <FiMessageCircle className="btn-icon" />
                      Message Requester
                    </button>
                  </div>
                )}
                
                {order.status === "cancelled" && (
                  <p className="status-cancelled">
                    ❌ Order has been cancelled.
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PasabuyerHistory;