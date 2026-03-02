import { auth, db } from "./firebase.js";
import { 
  doc, 
  getDoc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

window.login = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // --- 350 USER LIMIT LOGIC ---
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const statsRef = doc(db, "metadata", "stats");
      const statsSnap = await getDoc(statsRef);
      const currentCount = statsSnap.exists() ? statsSnap.data().userCount : 0;

      if (currentCount >= 350) {
        alert("Rekordz isn't accepting new users for now. Please try again later, use the preview option, or contact us.");
        await signOut(auth);
        return;
      }

      // If under limit, register user and increment count
      await setDoc(userRef, { joinedAt: new Date() });
      await setDoc(statsRef, { userCount: currentCount + 1 }, { merge: true });
    }
    // --- END LIMIT LOGIC ---

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