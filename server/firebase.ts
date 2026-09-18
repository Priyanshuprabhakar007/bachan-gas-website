import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, Firestore, doc, getDoc, setDoc, deleteDoc, getDocFromServer, collection, getDocs } from "firebase/firestore";
import session from "express-session";
import fs from "fs";
import path from "path";

let firebaseApp: any = null;
let firestoreDb: Firestore | null = null;

// Read configuration
let config: any = null;
try {
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (e) {
  console.warn("Could not load firebase-applet-config.json:", e);
}

if (!config) {
  config = {
    projectId: process.env.FIREBASE_PROJECT_ID || "primordial-will-pmn89",
    apiKey: process.env.FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "primordial-will-pmn89.firebaseapp.com",
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || "ai-studio-bachangas-8c836398-2757-4077-93a9-8c51eeb0e630",
  };
}

export function getFirebaseApp() {
  if (!getApps().length) {
    firebaseApp = initializeApp({
      apiKey: config.apiKey,
      projectId: config.projectId,
      appId: config.appId,
      authDomain: config.authDomain,
    });
  } else {
    firebaseApp = getApp();
  }
  return firebaseApp;
}

export function getDb(): Firestore {
  if (!firestoreDb) {
    const app = getFirebaseApp();
    const databaseId = config.firestoreDatabaseId || "(default)";
    firestoreDb = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      useFetchStreams: false,
    }, databaseId);
  }
  return firestoreDb;
}

/**
 * Validate Connection to Firestore at application boot, per SKILL.md
 */
export async function testConnection() {
  try {
    const db = getDb();
    await getDocFromServer(doc(db, "_test_connection", "boot_ping"));
    console.log("[Firebase] Firestore connection test successful.");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("[Firebase] Warning: Client is offline. Please check Firebase configuration.");
    } else {
      console.log("[Firebase] Firestore initialized. Note:", error?.message || error);
    }
  }
}

/**
 * Express Session Store backed by Google Cloud Firestore
 * Ensures user sessions are never lost across dev server reloads or container cycles.
 */
export class FirestoreSessionStore extends session.Store {
  // In-memory fallback cache for fast sub-millisecond retrieval
  private cache = new Map<string, { sess: any; expire: number }>();

  constructor() {
    super();
  }

  async get(sid: string, callback: (err: any, session?: session.SessionData | null) => void) {
    // Check in-memory cache first
    const cached = this.cache.get(sid);
    if (cached) {
      if (cached.expire > Date.now()) {
        return callback(null, cached.sess);
      }
      this.cache.delete(sid);
    }

    try {
      const db = getDb();
      const docRef = doc(db, "sessions", sid);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return callback(null, null);
      }

      const data = snapshot.data();
      const expireTime = data.expire ? new Date(data.expire).getTime() : 0;
      if (expireTime && expireTime < Date.now()) {
        deleteDoc(docRef).catch(() => {});
        return callback(null, null);
      }

      const parsed = typeof data.sess === "string" ? JSON.parse(data.sess) : data.sess;
      this.cache.set(sid, { sess: parsed, expire: expireTime || Date.now() + 86400000 });
      callback(null, parsed);
    } catch (err) {
      console.warn("[FirestoreSessionStore] get error:", err);
      // Fallback to cache if any
      if (cached) return callback(null, cached.sess);
      callback(null, null);
    }
  }

  async set(sid: string, sess: session.SessionData, callback?: (err?: any) => void) {
    const maxAge = sess.cookie?.maxAge || 30 * 24 * 60 * 60 * 1000;
    const expireTime = Date.now() + maxAge;
    const expireIso = new Date(expireTime).toISOString();

    // Update local cache immediately
    this.cache.set(sid, { sess, expire: expireTime });

    try {
      const db = getDb();
      const docRef = doc(db, "sessions", sid);
      await setDoc(docRef, {
        sid,
        sess: JSON.stringify(sess),
        expire: expireIso,
        updatedAt: new Date().toISOString(),
      });
      if (callback) callback();
    } catch (err) {
      console.warn("[FirestoreSessionStore] set error:", err);
      if (callback) callback(); // Non-blocking to keep UX responsive
    }
  }

  async destroy(sid: string, callback?: (err?: any) => void) {
    this.cache.delete(sid);
    try {
      const db = getDb();
      const docRef = doc(db, "sessions", sid);
      await deleteDoc(docRef);
      if (callback) callback();
    } catch (err) {
      console.warn("[FirestoreSessionStore] destroy error:", err);
      if (callback) callback();
    }
  }

  async touch(sid: string, sess: session.SessionData, callback?: (err?: any) => void) {
    const maxAge = sess.cookie?.maxAge || 30 * 24 * 60 * 60 * 1000;
    const expireTime = Date.now() + maxAge;
    this.cache.set(sid, { sess, expire: expireTime });

    try {
      const db = getDb();
      const docRef = doc(db, "sessions", sid);
      await setDoc(docRef, {
        expire: new Date(expireTime).toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      if (callback) callback();
    } catch (err) {
      if (callback) callback();
    }
  }
}
