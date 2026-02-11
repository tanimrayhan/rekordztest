import { auth } from "./firebase.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

/* LOGIN */
window.login = async () => {
  try {
    await signInWithPopup(auth, provider);
    // redirect handled below
  } catch (e) {
    console.error("Auth error:", e);
    alert(e.message);
  }
};

/* LOGOUT */
window.logout = async () => {
  await signOut(auth);
  window.location.href = "index.html";
};

/* AUTH STATE */
onAuthStateChanged(auth, user => {
  if (user) {
    // if logged in and on login page → dashboard
    if (
      location.pathname === "/" ||
      location.pathname.endsWith("index.html")
    ) {
      window.location.href = "dashboard.html";
    }
  } else {
    // if not logged in and not on login page → login
    if (
      !location.pathname.endsWith("index.html") &&
      location.pathname !== "/"
    ) {
      window.location.href = "index.html";
    }
  }
});
