import React, { useEffect, useRef, useState } from "react";
import { FaPaperPlane, FaShoppingBag, FaArrowLeft } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc, 
  onSnapshot,
  arrayUnion,
  serverTimestamp 
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNotification } from "../components/NotificationContext"; // Import notification context
import BottomNav from "../components/BottomNav";
import "./Chat.css";

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState(null);
  const [input, setInput] = useState("");
  const [threads, setThreads] = useState([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bodyRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // ✅ Get notification functions from context
  const { addNotification, clearNotifications } = useNotification();

  // Get current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
        fetchAllChats(currentUser.uid);
      } else {
        setLoading(false);
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // ✅ Clear notifications when component mounts (user opens chat page)
  useEffect(() => {
    clearNotifications();
  }, [clearNotifications]);

  // SIMPLIFIED: Fetch all chats and filter client-side
  const fetchAllChats = async (currentUserId) => {
    try {
      console.log("🔄 Fetching all chats...");
      
      const chatsRef = collection(db, "chats");
      
      const unsubscribe = onSnapshot(chatsRef, (querySnapshot) => {
        const allChats = [];
        
        querySnapshot.forEach((doc) => {
          const chatData = doc.data();
          allChats.push({
            id: doc.id,
            ...chatData,
            lastUpdated: chatData.lastUpdated?.toDate?.() || new Date(),
            time: formatTimeAgo(chatData.lastUpdated?.toDate?.() || new Date())
          });
        });

        // Filter chats client-side where user is participant
        const userChats = allChats.filter(chat => 
          chat.participants && chat.participants.includes(currentUserId)
        );

        // Sort by lastUpdated manually (client-side)
        userChats.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

        console.log(`✅ Found ${userChats.length} chats for user`);
        setThreads(userChats);
        setLoading(false);

        // Auto-open chat if coming from request acceptance
        if (location.state?.openChatId) {
          const threadToOpen = userChats.find(t => t.id === location.state.openChatId);
          if (threadToOpen) {
            openThread(threadToOpen);
          }
          // Clear the state to prevent re-opening on refresh
          window.history.replaceState({}, document.title);
        }
      }, (error) => {
        console.error("❌ Error in chat listener:", error);
        setLoading(false);
      });

      return unsubscribe;

    } catch (error) {
      console.error("❌ Error fetching chats:", error);
      setLoading(false);
    }
  };

  // Open chat thread - IMPROVED
  const openThread = async (chatThread) => {
    try {
      console.log("💬 Opening thread:", chatThread.id);
      
      // Fetch full chat data
      const chatRef = doc(db, "chats", chatThread.id);
      const chatSnap = await getDoc(chatRef);
      
      if (chatSnap.exists()) {
        const chatData = chatSnap.data();
        const fullThread = {
          ...chatThread,
          messages: chatData.messages || [],
          participantNames: chatData.participantNames || {},
          participantAvatars: chatData.participantAvatars || {},
          requestDetails: chatData.requestDetails || {}
        };
        
        setSelected(fullThread);
        setInput(""); // Reset input when opening new thread
        
        // ✅ Mark messages as read when opening thread
        markMessagesAsRead(fullThread);
        
        // Scroll to bottom after a short delay
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        console.log("❌ Chat thread not found");
        setSelected(null);
      }
    } catch (error) {
      console.error("❌ Error opening thread:", error);
      setSelected(null);
    }
  };

  // ✅ Mark messages as read function
  const markMessagesAsRead = async (chatThread) => {
    try {
      if (!chatThread.messages || !userId) return;
      
      const unreadMessages = chatThread.messages.filter(
        message => message.senderId !== userId && !message.read
      );
      
      if (unreadMessages.length > 0) {
        console.log(`📖 Marking ${unreadMessages.length} messages as read`);
        
        // Update messages in Firebase to mark as read
        const chatRef = doc(db, "chats", chatThread.id);
        const updatedMessages = chatThread.messages.map(message => 
          message.senderId !== userId && !message.read 
            ? { ...message, read: true, readAt: new Date() }
            : message
        );
        
        await updateDoc(chatRef, {
          messages: updatedMessages
        });
      }
    } catch (error) {
      console.error("❌ Error marking messages as read:", error);
    }
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Send message - IMPROVED WITH BETTER STATE MANAGEMENT
  const sendMessage = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    
    if (!trimmed || !selected || !userId || sending) return;
    
    try {
      setSending(true);
      
      const newMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderId: userId,
        text: trimmed,
        timestamp: new Date(),
        status: 'sent',
        read: false // New messages start as unread
      };

      const chatRef = doc(db, "chats", selected.id);
      
      // Update Firebase
      await updateDoc(chatRef, {
        messages: arrayUnion(newMessage),
        lastMessage: trimmed,
        lastUpdated: serverTimestamp()
      });

      // Clear input immediately for better UX
      setInput("");
      setSending(false);

      // Scroll to bottom after sending
      setTimeout(() => {
        scrollToBottom();
      }, 50);

    } catch (error) {
      console.error("❌ Error sending message:", error);
      alert("Failed to send message. Please try again.");
      setSending(false);
    }
  };

  // Real-time listener for selected chat - IMPROVED WITH NOTIFICATIONS
  useEffect(() => {
    if (!selected) return;

    console.log("👂 Setting up real-time listener for selected chat:", selected.id);
    
    const chatRef = doc(db, "chats", selected.id);
    const unsubscribe = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        const chatData = docSnap.data();
        const updatedThread = {
          ...selected,
          messages: chatData.messages || [],
          lastMessage: chatData.lastMessage,
          lastUpdated: chatData.lastUpdated,
          participantNames: chatData.participantNames || {},
          participantAvatars: chatData.participantAvatars || {},
          requestDetails: chatData.requestDetails || {}
        };
        
        setSelected(updatedThread);
        
        // ✅ Check for new messages and add notifications
        if (selected.messages && updatedThread.messages) {
          const newMessages = updatedThread.messages.filter(newMsg => 
            !selected.messages.some(oldMsg => oldMsg.id === newMsg.id) &&
            newMsg.senderId !== userId && // Only messages from others
            !newMsg.read // Only unread messages
          );
          
          if (newMessages.length > 0) {
            console.log(`🔔 ${newMessages.length} new message(s) received`);
            // Add notification for each new message
            newMessages.forEach(() => {
              addNotification();
            });
            
            // Auto-mark as read if this chat is currently open
            if (document.visibilityState === 'visible') {
              markMessagesAsRead(updatedThread);
            }
          }
        }
        
        // Update threads list to keep it in sync
        setThreads(prev => prev.map(thread => 
          thread.id === selected.id ? updatedThread : thread
        ));

        // Scroll to bottom when new message arrives (only if not sending)
        if (!sending) {
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      }
    }, (error) => {
      console.error("❌ Error in selected chat listener:", error);
    });

    return () => {
      console.log("🔇 Cleaning up selected chat listener");
      unsubscribe();
    };
  }, [selected, sending, userId, addNotification]);

  // Real-time listener for all chats - FOR NOTIFICATIONS
  useEffect(() => {
    if (!userId) return;

    console.log("👂 Setting up global chat listener for notifications");
    
    const chatsRef = collection(db, "chats");
    const unsubscribe = onSnapshot(chatsRef, (querySnapshot) => {
      let totalUnread = 0;
      
      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        
        // Check if user is participant in this chat
        if (chatData.participants && chatData.participants.includes(userId)) {
          // Count unread messages from other participants
          const unreadMessages = (chatData.messages || []).filter(
            message => message.senderId !== userId && !message.read
          );
          
          totalUnread += unreadMessages.length;
        }
      });
      
      console.log(`📊 Total unread messages: ${totalUnread}`);
      
      // Update notifications based on unread count
      // This ensures the badge shows the actual unread count
      if (totalUnread > 0) {
        // We'll use a different approach - the individual message listeners will handle notifications
      }
    }, (error) => {
      console.error("❌ Error in global chat listener:", error);
    });

    return () => {
      console.log("🔇 Cleaning up global chat listener");
      unsubscribe();
    };
  }, [userId]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (selected?.messages) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [selected?.messages]);

  // Handle navigation from request acceptance
  useEffect(() => {
    if (location.state?.openChatId && threads.length > 0 && !selected) {
      const threadToOpen = threads.find(t => t.id === location.state.openChatId);
      if (threadToOpen) {
        openThread(threadToOpen);
      }
    }
  }, [location.state, threads, selected]);

  // Handle back button
  const handleBack = () => {
    if (selected) {
      setSelected(null);
      setInput("");
    } else {
      navigate('/home');
    }
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

  // Format message time
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get other participant's info
  const getOtherParticipant = (chatThread) => {
    if (!chatThread.participants || !userId) return null;
    
    const otherParticipantId = chatThread.participants.find(id => id !== userId);
    
    const otherParticipantName = chatThread.participantNames?.[otherParticipantId] || 
                               "User";
    
    return {
      id: otherParticipantId,
      name: otherParticipantName,
      avatar: chatThread.participantAvatars?.[otherParticipantId] || 
             "https://cdn-icons-png.flaticon.com/512/706/706830.png"
    };
  };

  // ✅ Get unread message count for a thread
  const getUnreadCount = (chatThread) => {
    if (!chatThread.messages || !userId) return 0;
    
    return chatThread.messages.filter(
      message => message.senderId !== userId && !message.read
    ).length;
  };

  // ✅ Simulate receiving new messages (for demo purposes)
  useEffect(() => {
    // Only simulate if not in development and for demo
    if (process.env.NODE_ENV === 'development') {
      const simulateMessageInterval = setInterval(() => {
        // Randomly simulate receiving a message (10% chance every 30 seconds)
        if (Math.random() < 0.1 && threads.length > 0 && !selected) {
          const randomThread = threads[Math.floor(Math.random() * threads.length)];
          console.log("🤖 Simulating new message in:", randomThread.id);
          
          // Add a notification
          addNotification();
        }
      }, 30000);

      return () => clearInterval(simulateMessageInterval);
    }
  }, [threads, selected, addNotification]);

  if (loading) {
    return (
      <div className="chat-page">
        <div className="loading-chats">
          <div className="loading-spinner"></div>
          <p>Loading messages...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="chat-page">
      <header className="chat-header">
        <button className="back-btn" onClick={handleBack}>
          <FaArrowLeft />
        </button>
        <h1>Messages</h1>
        <div style={{width: '40px'}}></div> {/* Spacer for balance */}
      </header>

      <main className="chat-content">
        {threads.length === 0 ? (
          <div className="no-chats">
            <FaShoppingBag className="no-chats-icon" />
            <h3>No messages yet</h3>
            <p>When you accept a request, you'll see conversations here.</p>
          </div>
        ) : (
          <section className="chat-list">
            {threads.map((thread) => {
              const otherParticipant = getOtherParticipant(thread);
              const unreadCount = getUnreadCount(thread);
              
              return (
                <article
                  className={`chat-card ${selected?.id === thread.id ? 'active' : ''} ${unreadCount > 0 ? 'unread' : ''}`}
                  key={thread.id}
                  onClick={() => openThread(thread)}
                >
                  <div className="chat-user">
                    <img src={otherParticipant?.avatar} alt={otherParticipant?.name} />
                    {unreadCount > 0 && (
                      <span className="chat-unread-indicator">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="chat-info">
                    <div className="chat-top">
                      <h4>{otherParticipant?.name}</h4>
                      <span className="chat-time">{thread.time}</span>
                    </div>
                    <p className="chat-message">{thread.lastMessage || "No messages yet"}</p>
                    <div className="request-preview">
                      <FaShoppingBag className="store-icon" />
                      <span>{thread.requestDetails?.store || "Unknown Store"} • ₱{thread.requestDetails?.budget?.toLocaleString() || "0"}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <BottomNav />

      {selected && (
        <div className="conv-backdrop">
          <section className="conv-panel">
            <header className="conv-header">
              <div className="conv-peer">
                {(() => {
                  const otherParticipant = getOtherParticipant(selected);
                  return (
                    <>
                      <img src={otherParticipant?.avatar} alt={otherParticipant?.name} />
                      <div className="peer-info">
                        <h4>{otherParticipant?.name}</h4>
                        <span className="peer-status">Online</span>
                      </div>
                    </>
                  );
                })()}
              </div>
              <button className="conv-close" onClick={() => setSelected(null)}>
                ✕
              </button>
            </header>

            {/* Request Details Banner */}
            {selected.requestDetails && (
              <div className="request-banner">
                <div className="banner-content">
                  <FaShoppingBag className="banner-icon" />
                  <div className="banner-details">
                    <strong>{selected.requestDetails.store || "Store"}</strong>
                    <span>₱{selected.requestDetails.budget?.toLocaleString() || "0"} • {selected.requestDetails.title || "Item"}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="conv-body" ref={bodyRef}>
              {selected.messages?.length === 0 ? (
                <div className="no-messages">
                  <FaShoppingBag className="no-messages-icon" />
                  <p>No messages yet</p>
                  <small>Start the conversation about your Pasabuy request</small>
                </div>
              ) : (
                selected.messages?.map((message) => (
                  <div 
                    key={message.id} 
                    className={`bubble ${message.senderId === userId ? 'me' : 'them'} ${!message.read && message.senderId !== userId ? 'unread' : ''}`}
                  >
                    <div className="bubble-text">{message.text}</div>
                    <div className="bubble-time">
                      {formatMessageTime(message.timestamp)}
                      {message.senderId === userId && (
                        <span className="message-status">
                          {message.read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="conv-composer" onSubmit={sendMessage}>
              <input
                className="conv-input"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
              />
              <button 
                className={`conv-send ${sending ? 'sending' : ''}`} 
                type="submit" 
                disabled={!input.trim() || sending}
              >
                {sending ? (
                  <div className="send-spinner"></div>
                ) : (
                  <FaPaperPlane />
                )}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default Chat;