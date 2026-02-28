import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  collection, addDoc, doc, getDoc, getDocs, updateDoc, deleteDoc
} from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

let user = null;

/* ======================
   TEST MODE MEMORY
   Uses sessionStorage to keep data alive between pages
====================== */
const isTestMode = sessionStorage.getItem("testMode") === "true";
let tempNotes = isTestMode ? JSON.parse(sessionStorage.getItem("tempNotes") || "{}") : {};

/* ======================
   AUTH GUARD
====================== */
onAuthStateChanged(auth, u => {
  if (sessionStorage.getItem("testMode") === "true") {
    user = { uid: "test-user" }; 
    init();
    return;
  }
  if (!u) {
    location.href = "index.html";
  } else {
    user = u;
    init();
  }
});

function init() {
  if (typeof notesList !== "undefined" && notesList) loadNotes();
  if (typeof content !== "undefined" && content) loadNote();
}


/* ======================
   LOAD NOTES LIST (INSTANT CLICK + BLUE BIN)
====================== */
async function loadNotes() {
  const notesList = document.getElementById("notesList");
  if (!notesList) return;
  notesList.innerHTML = "";
  
  const processItem = (id, titleText) => {
    const li = document.createElement("li");
    li.className = "tuition"; 
    li.id = `row-${id.replace(/\s+/g, '-')}`; 
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.padding = "0";

    li.innerHTML = `
      <div style="width: 40px;"></div>
      <span onclick="window.location.href='note-details.html?id=${id}'" 
            style="flex:1; cursor:pointer; text-align: center; font-weight: bold; padding: 15px 0; display: block;">
        ${titleText}
      </span>
      <button onclick="event.stopPropagation(); deleteItem('${id}', 'notes')" 
              style="background:transparent; border:none; cursor:pointer; width: 40px; display:flex; justify-content: center; align-items:center; padding:0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#add8e6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </button>
    `;
    notesList.appendChild(li);
  };

  if (isTestMode) {
    const notesData = JSON.parse(sessionStorage.getItem("tempNotes") || "{}");
    Object.keys(notesData).forEach(id => processItem(id, notesData[id].title));
  } else {
    const snap = await getDocs(collection(db, "users", user.uid, "notes"));
    snap.forEach(n => processItem(n.id, n.data().title));
  }
}

/* ======================
   ADD NOTE
====================== */
window.addNote = async () => {
  if (!title.value) return;

  if (isTestMode) {
    const id = Date.now().toString();
    tempNotes[id] = { title: title.value, content: "" };
    sessionStorage.setItem("tempNotes", JSON.stringify(tempNotes));
  } else {
    await addDoc(collection(db, "users", user.uid, "notes"), {
      title: title.value,
      content: ""
    });
  }

  title.value = "";
  loadNotes();
};

/* ======================
   LOAD NOTE DETAILS (In note-details.html)
====================== */
async function loadNote() {
  const id = new URLSearchParams(location.search).get("id");

  if (isTestMode) {
    tempNotes = JSON.parse(sessionStorage.getItem("tempNotes") || "{}");
    const note = tempNotes[id] || { title: "", content: "" };
    title.value = note.title;
    content.value = note.content;
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid, "notes", id));
  title.value = snap.data().title;
  content.value = snap.data().content;
}

/* ======================
   SAVE NOTE
====================== */
window.saveNote = async () => {
  const id = new URLSearchParams(location.search).get("id");

  if (isTestMode) {
    tempNotes = JSON.parse(sessionStorage.getItem("tempNotes") || "{}");
    if (tempNotes[id]) {
      tempNotes[id].title = title.value; // Sync the title
      tempNotes[id].content = content.value;
      sessionStorage.setItem("tempNotes", JSON.stringify(tempNotes));
    }
  } else {
    await updateDoc(doc(db, "users", user.uid, "notes", id), {
      title: title.value, // Now also updates title in Firebase
      content: content.value
    });
  }

  alert("Saved");
};
/* ===============================
   INSTANT UNIVERSAL DELETE 
=============================== */
window.deleteItem = async (id, type) => {
  // 1. Instant Confirmation
  if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

  // 2. SPEED FIX: Instantly hide the row so the user doesn't wait
  const rowId = `row-${id.replace(/\s+/g, '-')}`;
  const rowElement = document.getElementById(rowId);
  if (rowElement) {
    rowElement.style.display = "none";
  }

  // 3. Background Deletion
  try {
    if (isTestMode) {
      // Logic for Test Mode (sessionStorage)
      if (type === 'notes') {
        let temp = JSON.parse(sessionStorage.getItem("tempNotes") || "{}");
        delete temp[id];
        sessionStorage.setItem("tempNotes", JSON.stringify(temp));
      } else if (type === 'ct') {
        let temp = JSON.parse(sessionStorage.getItem("tempCTCourses") || "{}");
        delete temp[id];
        sessionStorage.setItem("tempCTCourses", JSON.stringify(temp));
      } else if (type === 'tuition') {
        // tuition.js uses global tempTuitions variable
        delete tempTuitions[id];
      }
    } else {
      // Logic for Firebase Mode
      const path = type === 'notes' ? 'notes' : (type === 'ct' ? 'ctCourses' : 'tuitions');
      
      // Select the correct user variable (notes/ct use 'user', tuition uses 'currentUser')
      const activeUser = (typeof user !== 'undefined') ? user : currentUser;
      
      await deleteDoc(doc(db, "users", activeUser.uid, path, id));
    }
  } catch (error) {
    // If it fails, bring the item back so the user knows it's not gone
    if (rowElement) rowElement.style.display = "flex";
    alert("Delete failed: " + error.message);
  }
};