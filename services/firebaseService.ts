
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import type { PhotoFrame } from "../types";

// FIX: Export the FirebaseConfig type to resolve an import error in ApiKeyModal.tsx.
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

// The user's Firebase configuration is now hardcoded into the application.
const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyCwTd9Hv7rNPAduVQZ02icx5-EytbR8w-U",
  authDomain: "hamic-s-photobooth.firebaseapp.com",
  projectId: "hamic-s-photobooth",
  // Corrected storageBucket format for better compatibility.
  storageBucket: "hamic-s-photobooth.appspot.com",
  messagingSenderId: "764540927",
  appId: "1:764540927:web:64aab1aebe9e9cf8f3d9ca",
  measurementId: "G-54V4W542XL"
};


let firebaseApp: FirebaseApp | null = null;
let initPromise: Promise<{ success: boolean; error?: string }> | null = null;

export const initializeFirebaseApp = (): Promise<{ success: boolean; error?: string }> => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async (): Promise<{ success: boolean; error?: string }> => {
    if (firebaseApp) return { success: true };

    try {
      firebaseApp = initializeApp(firebaseConfig);
      
      const auth = getAuth(firebaseApp);
      await signInAnonymously(auth);

      console.log("Firebase initialized and user signed in anonymously.");
      return { success: true };
    } catch (error: any) {
      console.error("Failed to initialize Firebase and sign in:", error);
      let userFriendlyError: string;

      if (error.code === 'auth/configuration-not-found') {
        userFriendlyError = `ACTION REQUIRED: The current domain (${window.location.hostname}) is not authorized for Firebase Authentication. Please add it to the list of authorized domains in your Firebase project settings (Authentication -> Settings -> Authorized domains).`;
      } else if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/admin-restricted-operation') {
        userFriendlyError = 'ACTION REQUIRED: Anonymous sign-in is not enabled. Please go to your Firebase Console (Authentication -> Sign-in method) and enable the "Anonymous" provider.';
      } else {
        userFriendlyError = `An unexpected Firebase error occurred: ${error.message}`;
      }
      
      firebaseApp = null;
      return { success: false, error: userFriendlyError };
    }
  })();
  
  initPromise.then(result => {
    if (!result.success) {
      initPromise = null; // Allow retrying if it fails.
    }
  });

  return initPromise;
};


export const uploadImageAndGetData = async (
  blob: Blob,
  frame: Pick<PhotoFrame, 'topic' | 'number'>
): Promise<string | null> => {
  if (!initPromise) {
     console.error("Firebase initialization has not been attempted.");
     alert("Firebase is not configured. Please refresh and check the configuration.");
     return null;
  }
  const initResult = await initPromise;
  if (!initResult.success || !firebaseApp) {
    console.error("Firebase not initialized. Cannot upload image.");
    alert(`Firebase connection failed. This might be a configuration issue or a network problem. Error: ${initResult.error}`);
    return null;
  }

  const storage = getStorage(firebaseApp!);
  const db = getFirestore(firebaseApp!);
  
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const fileName = `photobooth-${uniqueId}.png`;
  const storageRef = ref(storage, `uploads/${fileName}`);

  try {
    const snapshot = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);

    await addDoc(collection(db, "photobooth_uploads"), {
      storagePath: snapshot.ref.fullPath,
      downloadURL: downloadURL,
      createdAt: new Date(),
      frameTopic: frame.topic,
      frameNumber: frame.number,
    });

    return downloadURL;

  } catch (error) {
    console.error("Error uploading image:", error);
    alert("Image upload failed. Please check your Firebase Storage rules and ensure the service is active.");
    return null;
  }
};