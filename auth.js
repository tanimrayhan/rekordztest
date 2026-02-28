import { auth } from "./firebase.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

window.login = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    alert(err.message);
  }
};

window.logout = async () => {

  // sign out firebase if logged in
  try {
    await signOut(auth);
  } catch (e) {}

  // remove test mode
  sessionStorage.removeItem("testMode");

  // remove temporary test data (absent tracker etc)
  sessionStorage.removeItem("tempAbsents");

  // go to home
  location.href = "index.html";
};

onAuthStateChanged(auth, user => {

  // 🔥 IMMEDIATE TEST MODE EXIT
  if (sessionStorage.getItem("testMode") === "true") {
    console.log("TEST MODE ACTIVE");
    return;
  }

  const onLogin =
    location.pathname === "/" ||
    location.pathname.endsWith("index.html");

  if (user && onLogin) location.href = "dashboard.html";
  if (!user && !onLogin) location.href = "index.html";

});