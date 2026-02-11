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
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

/* LOGOUT */
window.logout = async () => {
  await signOut(auth);
  location.href = "index.html";
};

/* AUTH STATE HANDLER */
onAuthStateChanged(auth, user => {
  const path = location.pathname;
  const onLoginPage =
    path === "/" || path === "" || path.endsWith("index.html");

  if (user && onLoginPage) {
    location.href = "dashboard.html";
  }

  if (!user && !onLoginPage) {
    location.href = "index.html";
  }
});
