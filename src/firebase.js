import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDOWpQeLjNUu2Fw0F1K8jtMmyuYQPjD0W0",
  authDomain: "rankboard-e6956.firebaseapp.com",
  projectId: "rankboard-e6956",
  storageBucket: "rankboard-e6956.firebasestorage.app",
  messagingSenderId: "312934409282",
  appId: "1:312934409282:web:273e517ec0152ba24e39db"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
