// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FireBase_APIkey,
    authDomain: import.meta.env.VITE_FireBase_Auth_Domain,
    projectId: import.meta.env.VITE_FireBase_Project_ID,
    storageBucket: import.meta.env.VITE_FireBase_Storage_Bucket,
    messagingSenderId: import.meta.env.VITE_FireBase_Messaging_Sender_ID,
    appId: import.meta.env.VITE_FireBase_App_ID,
    measurementId: import.meta.env.VITE_FireBase_Measurment_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const messaging = getMessaging(app);

// Re-export common modular Firestore functions to avoid dual-package module hazards
export {
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    onSnapshot,
} from "firebase/firestore";
export {
    signInWithEmailAndPassword,
    signOut,
} from "firebase/auth";

// // ✅ Connect to emulators only in local dev
if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    (window.location.hostname === "192.168.1.22" &&
        window.location.port === "8080")
) {
    // Firestore emulator
    connectFirestoreEmulator(db, "127.0.0.1", 8085);

    // Auth emulator
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

    // Functions emulator
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
//connectAuthEmulator(auth, "http://localhost:9099");
export default app;
