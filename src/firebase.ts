import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth, type User } from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc, type Firestore } from 'firebase/firestore';

export type CloudProgressState = {
  noCount: number;
  themeId: string;
  darkMode: boolean;
  startDate: string;
};

export type CloudDailyLog = {
  date: string;
  count: number;
};

export type CloudUserData = {
  progress: CloudProgressState;
  savedQuotes: string[];
  dailyLogs: CloudDailyLog[];
  updatedAt: string;
};

type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

let services: FirebaseServices | null = null;

export function getFirebaseServices(): FirebaseServices | null {
  if (!hasFirebaseConfig()) return null;
  if (services) return services;

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  services = { app, auth, db };
  return services;
}

export function isFirebaseEnabled() {
  return getFirebaseServices() !== null;
}

export function listenToCloudUser(callback: (user: User | null) => void) {
  const firebase = getFirebaseServices();
  if (!firebase) {
    callback(null);
    return () => undefined;
  }

  const unsubscribe = onAuthStateChanged(firebase.auth, callback);

  signInAnonymously(firebase.auth).catch(() => {
    callback(null);
  });

  return unsubscribe;
}

export async function loadCloudUserData(userId: string): Promise<CloudUserData | null> {
  const firebase = getFirebaseServices();
  if (!firebase) return null;

  const snapshot = await getDoc(doc(firebase.db, 'users', userId));
  if (!snapshot.exists()) return null;

  return snapshot.data() as CloudUserData;
}

export async function saveCloudUserData(userId: string, data: Omit<CloudUserData, 'updatedAt'>) {
  const firebase = getFirebaseServices();
  if (!firebase) return;

  await setDoc(
    doc(firebase.db, 'users', userId),
    {
      ...data,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}
