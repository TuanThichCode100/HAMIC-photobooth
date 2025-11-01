import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, Auth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL, FirebaseStorage } from "firebase/storage";
import { getFirestore, collection, addDoc, Firestore } from "firebase/firestore";
import type { PhotoFrame } from "../types";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyCwTd9Hv7rNPAduVQZ02icx5-EytbR8w-U",
  authDomain: "hamic-s-photobooth.firebaseapp.com",
  projectId: "hamic-s-photobooth",
  storageBucket: "hamic-s-photobooth.appspot.com",
  messagingSenderId: "764540927",
  appId: "1:764540927:web:64aab1aebe9e9cf8f3d9ca",
  measurementId: "G-54V4W542XL",
};

let firebaseApp: FirebaseApp;
let auth: Auth;
let storage: FirebaseStorage;
let db: Firestore;

const initPromise = (async () => {
  try {
    // 🔥 Đảm bảo không khởi tạo trùng trong chế độ dev HMR
    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

    // Gắn các service đúng instance
    auth = getAuth(firebaseApp);
    storage = getStorage(firebaseApp);
    db = getFirestore(firebaseApp);

    await signInAnonymously(auth);
    console.log("Firebase initialized and signed in anonymously.");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    throw error;
  }
})();

export const getFirebaseInitializationPromise = () => initPromise;

export const uploadImageAndGetData = async (
  blob: Blob,
  frame: Pick<PhotoFrame, "topic" | "number">
): Promise<string | null> => {
  try {
    await initPromise;
  } catch (e) {
    console.error("Cannot upload: Firebase not initialized.");
    return null;
  }

  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const fileName = `photobooth-${uniqueId}.png`;
  const storageRef = ref(storage, `uploads/${fileName}`);

  try {
    const snapshot = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);

    await addDoc(collection(db, "photobooth_uploads"), {
      storagePath: snapshot.ref.fullPath,
      downloadURL,
      createdAt: new Date(),
      frameTopic: frame.topic,
      frameNumber: frame.number,
    });

    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    alert("Image upload failed. Please check your Firebase Storage rules.");
    return null;
  }
};
