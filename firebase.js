import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCFAM3wdERSE2UzUA8mO9k4eLU8HNkV0Zs",
  authDomain: "student-tracker-trh.firebaseapp.com",
  projectId: "student-tracker-trh",
  storageBucket: "student-tracker-trh.firebasestorage.app",
  messagingSenderId: "135344482420",
  appId: "1:135344482420:web:baf23faca42d6ddb478921"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
