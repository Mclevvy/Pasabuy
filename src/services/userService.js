// src/services/userService.js
import { 
  doc, 
  setDoc, 
  collection, 
  getDocs, 
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// Gumawa ng user document kapag nag-register ang user
export const createUserProfile = async (userData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      ...userData
    });
    
    return { success: true, message: 'User profile created successfully' };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

// Mag-add ng request sa user-specific collection
export const addUserRequest = async (requestData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    const requestRef = doc(collection(db, 'users', user.uid, 'requests'));
    const requestId = requestRef.id;
    
    await setDoc(requestRef, {
      requestId: requestId,
      userId: user.uid,
      ...requestData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { success: true, requestId, message: 'Request added successfully' };
  } catch (error) {
    console.error('Error adding request:', error);
    return { success: false, error: error.message };
  }
};

// Kunin lahat ng requests ng current user
export const getUserRequests = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    const requestsRef = collection(db, 'users', user.uid, 'requests');
    const q = query(requestsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const requests = [];
    querySnapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, requests };
  } catch (error) {
    console.error('Error getting requests:', error);
    return { success: false, error: error.message, requests: [] };
  }
};

// I-update ang request
export const updateUserRequest = async (requestId, updateData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    const requestRef = doc(db, 'users', user.uid, 'requests', requestId);
    await updateDoc(requestRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true, message: 'Request updated successfully' };
  } catch (error) {
    console.error('Error updating request:', error);
    return { success: false, error: error.message };
  }
};

// Mag-delete ng request
export const deleteUserRequest = async (requestId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    const requestRef = doc(db, 'users', user.uid, 'requests', requestId);
    await deleteDoc(requestRef);
    
    return { success: true, message: 'Request deleted successfully' };
  } catch (error) {
    console.error('Error deleting request:', error);
    return { success: false, error: error.message };
  }
};

// Kunin ang user profile
export const getUserProfile = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDocs(userRef);
    
    if (userSnap.exists()) {
      return { success: true, profile: userSnap.data() };
    } else {
      return { success: false, error: 'User profile not found' };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error: error.message };
  }
};