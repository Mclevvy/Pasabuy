// src/services/authService.js
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { createUserProfile } from './userService';

// Mag-register ng bagong user
export const registerUser = async (email, password, userData) => {
  try {
    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile display name kung meron
    if (userData.displayName) {
      await updateProfile(user, {
        displayName: userData.displayName
      });
    }

    // Create user profile in Firestore
    const result = await createUserProfile(userData);
    
    if (result.success) {
      return { 
        success: true, 
        user: user,
        message: 'User registered successfully' 
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error registering user:', error);
    return { success: false, error: error.message };
  }
};

// Mag-login
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, error: error.message };
  }
};

// Mag-logout
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true, message: 'Logged out successfully' };
  } catch (error) {
    console.error('Error logging out:', error);
    return { success: false, error: error.message };
  }
};