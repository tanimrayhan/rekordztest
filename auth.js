import { auth, db } from "./firebase.js";
import { 
  doc, 
  getDoc, 
  getDocs,
  collection,
  setDoc,
  runTransaction 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const provider = new GoogleAuthProvider();
async function checkLoginLimit() {

  const statsRef = doc(db, "metadata", "stats");
  const snap = await getDoc(statsRef);

  const count = snap.exists() ? (snap.data().userCount || 0) : 0;

  const LIMIT = 3;

  if (count >= LIMIT) {

    alert("Only existing users can login for now. REKORDZ isn’t accepting new users at the moment.");

    return false;
  }

  return true;
}
window.login = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
const userSnap = await getDoc(userRef);

if (!userSnap.exists()) {

  const allowed = await checkLoginLimit();

  if (!allowed) {
    await signOut(auth);
    location.href = "index.html";
    return;
  }

  const statsRef = doc(db, "metadata", "stats");
  const snap = await getDoc(statsRef);
  const count = snap.exists() ? (snap.data().userCount || 0) : 0;

  await setDoc(userRef, {
    registeredAt: new Date(),
    email: user.email,
    displayName: user.displayName
  });

  await setDoc(statsRef, { userCount: count + 1 }, { merge: true });

}

    sessionStorage.removeItem("testMode");
    location.href = "dashboard.html";
  } catch (error) {
    console.error("Login failed:", error);
  }
};

window.logout = async () => {
  try {
    await signOut(auth);
    sessionStorage.removeItem("testMode");
    sessionStorage.removeItem("redirectDone");
    location.href = "index.html";
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

window.checkAndIncrementUser = async () => {
  const user = auth.currentUser;
if (sessionStorage.getItem("testMode") === "true") return;

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const statsRef = doc(db, "metadata", "stats");
      await runTransaction(db, async (transaction) => {
        const statsSnap = await transaction.get(statsRef);
        const currentCount = statsSnap.exists() ? (Number(statsSnap.data().userCount) || 0) : 0;

        if (currentCount >= 3) {
          alert("REKORDZ is not accepting new users at the moment. Please use Preview Mode for now, and try again later or contact us.");
          throw "LIMIT_REACHED"; 
        }

        transaction.set(statsRef, { userCount: currentCount + 1 }, { merge: true });
        transaction.set(userRef, { registeredAt: new Date() });
      });
    }
  } catch (err) {
    if (err === "LIMIT_REACHED") throw err;
    // 🔥 OFFLINE ERROR FIX: This log stops the popup alert from happening
    console.warn("Silent network check failed. App will proceed.");
  }
};

onAuthStateChanged(auth, (user) => {
  // 🚀 If real user exists, force exit preview mode
if (user && sessionStorage.getItem("testMode") === "true") {
  sessionStorage.removeItem("testMode");
}
  // 🔥 Restore navbar visibility after Firebase initializes
const topActions = document.querySelectorAll(".top-actions");
topActions.forEach(el => el.style.visibility = "visible");
  const isTest = sessionStorage.getItem("testMode") === "true";
  const isIndex = location.pathname.endsWith("index.html") || location.pathname === "/";
  const loginContainer = document.querySelector(".login-container");

  // 1. Logic for Index Page Visibility (Flicker Control)
  if (isIndex && loginContainer) {
    if (user || isTest) {
      // Hide them if we are already logged in/previewing
      loginContainer.style.display = "none";
    } else {
      // 🔥 SHOW THEM: This ensures logged-out users ALWAYS see the buttons
      loginContainer.style.display = "flex";
    }
  }

  // 2. Redirect Logic
  if (user && isIndex && !sessionStorage.getItem("redirectDone")) {
    sessionStorage.setItem("redirectDone", "true");
    location.href = "dashboard.html";
    return;
  }

  const loginBtns = document.querySelectorAll("#loginBtn");
  const previewBtns = document.querySelectorAll("#previewBtn");

  if (user) {
    const firstName = user.displayName ? user.displayName.split(" ")[0].toUpperCase() : "USER";
    loginBtns.forEach(btn => {
      btn.innerText = firstName;
      btn.onclick = () => { location.href = "dashboard.html"; };
    });
    previewBtns.forEach(btn => {
      btn.innerText = "LOGOUT";
      btn.onclick = window.logout;
      btn.classList.add("no-glow");
    });
  } else if (isTest) {
    if (isIndex) {
      loginBtns.forEach(btn => { btn.innerText = "LOGIN"; btn.onclick = window.login; });
      previewBtns.forEach(btn => { btn.innerText = "PREVIEW"; btn.onclick = () => location.href='dashboard.html'; });
    } else {
      loginBtns.forEach(btn => { btn.innerText = "USER"; btn.onclick = () => location.href='dashboard.html'; });
      previewBtns.forEach(btn => { 
        btn.innerText = "LOGOUT"; 
        btn.onclick = window.logout; 
        btn.classList.add("no-glow");
      });
    }
  } else {
    // Standard Logged Out State
    loginBtns.forEach(btn => { 
      btn.innerText = "LOGIN"; 
      btn.onclick = window.login; 
    });
    previewBtns.forEach(btn => { 
      btn.innerText = "PREVIEW"; 
      btn.onclick = () => { sessionStorage.setItem("testMode", "true"); location.href = "dashboard.html"; };
      btn.classList.remove("no-glow");
    });
  }
});
// --- ADD TO THE BOTTOM OF auth.js ---

// 1. Universal Fetcher: Works for ANY collection (notes, absents, expenses, etc.)
window.getFastData = async (collectionName, docId = null) => {
  const user = auth.currentUser;
  if (!user) return null;

  // This creates a unique key like "cache_notes_user123" or "cache_absents_courseA_user123"
  const cacheKey = `cache_${collectionName}_${docId || 'list'}_${user.uid}`;
  const cached = sessionStorage.getItem(cacheKey);

if (cached) {
  const parsed = JSON.parse(cached);

  const CACHE_TTL = 10000; // 🔥 10 seconds

  if (Date.now() - parsed.timestamp < CACHE_TTL) {
    console.log(`%c Cache Valid: ${collectionName}`, 'color: #00ff00');
    return parsed.data;
  } else {
    console.log(`%c Cache Expired: ${collectionName}`, 'color: #ff0000');
    sessionStorage.removeItem(cacheKey);
  }
}

  console.log(`%c Firebase Read: ${collectionName}`, 'color: #ff9900');
  let data;
  if (docId) {
    // Fetches a single document (like a specific Course in Absent Tracker)
    const snap = await getDoc(doc(db, "users", user.uid, collectionName, docId));
    data = snap.exists() ? snap.data() : null;
  } else {
    // Fetches a whole list (like all Notes or all Tuition entries)
    const snap = await getDocs(collection(db, "users", user.uid, collectionName));
    data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  const payload = {
  data,
  timestamp: Date.now()
};

sessionStorage.setItem(cacheKey, JSON.stringify(payload));
  return data;
};

// 2. Universal Clearer: Use this whenever you Add, Edit, or Delete
window.clearDataCache = (collectionName, docId = null) => {
  const user = auth.currentUser;
  if (!user) return;
  const cacheKey = `cache_${collectionName}_${docId || 'list'}_${user.uid}`;
  sessionStorage.removeItem(cacheKey);
  console.log(`%c Cache Cleared: ${collectionName}`, 'color: #ff0000');
};