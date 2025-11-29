// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAGsCBbIL6H3yeQheO2cSd69cXk0yJVJh0",
  authDomain: "pasabuy-fe4e9.firebaseapp.com",
  databaseURL: "https://pasabuy-fe4e9-default-rtdb.firebaseio.com",
  projectId: "pasabuy-fe4e9",
  storageBucket: "pasabuy-fe4e9.firebasestorage.app",
  messagingSenderId: "586837676661",
  appId: "1:586837676661:web:b884b829cc2b917d425e3c",
  measurementId: "G-JPE06C2FCZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const database = getDatabase(app);

// Only initialize analytics in browser environment
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export { analytics };

export default app;