import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, doc, getDocFromServer, setLogLevel } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase Applet Configuration
const firebaseConfig = {
  projectId: "primordial-will-pmn89",
  appId: "1:195787241971:web:b3e1c8f4fda4473aa6fa86",
  apiKey: "AIzaSyBac5OL_26-SS80lOMpHvgyFRXsRZ9czys",
  authDomain: "primordial-will-pmn89.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-bachangas-8c836398-2757-4077-93a9-8c51eeb0e630",
  storageBucket: "primordial-will-pmn89.firebasestorage.app",
  messagingSenderId: "195787241971",
  oAuthClientId: "195787241971-ma6ot177mpot7grqoonjfaaficgj31re.apps.googleusercontent.com"
};

// Set log level to only errors to suppress annoying non-fatal WebSocket connection warnings
setLogLevel("error");

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use initializeFirestore with experimentalForceLongPolling to bypass WebSocket blocks
// Disable useFetchStreams to prevent the WebChannel stream/transport issue in v12.19.0
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
}, firebaseConfig.firestoreDatabaseId);

export const storage = getStorage(app, firebaseConfig.storageBucket);

// Test Firestore connection per SKILL.md
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "_test_connection", "boot_ping"));
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("[Firebase] Warning: Client is offline. Please check connection.");
    }
  }
}

if (typeof window !== "undefined") {
  testConnection().catch(() => {});
}
