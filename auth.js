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
  await signOut(auth);
  location.href = "index.html";
};

onAuthStateChanged(auth, user => {
  const onLogin =
    location.pathname === "/" ||
    location.pathname.endsWith("index.html");

  if (user && onLogin) location.href = "dashboard.html";
  if (!user && !onLogin) location.href = "index.html";
});
