import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  collection, addDoc, doc, getDoc, getDocs, updateDoc
} from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

let user = null;

/* ======================
   TEST MODE MEMORY
====================== */
const isTestMode = sessionStorage.getItem("testMode") === "true";
let tempNotes = {};

/* ======================
   AUTH GUARD
====================== */
onAuthStateChanged(auth, u => {

  if (sessionStorage.getItem("testMode") === "true") {
    user = { uid: "test-user" }; // fake user for testing
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

/* ======================
   INITIALIZER
====================== */
function init() {
  if (typeof notesList !== "undefined" && notesList) loadNotes();
  if (typeof content !== "undefined" && content) loadNote();
}

/* ======================
   LOAD NOTES LIST
====================== */
async function loadNotes() {

  notesList.innerHTML = "";

  if (isTestMode) {

    Object.keys(tempNotes).forEach(id => {
      const li = document.createElement("li");
      li.textContent = tempNotes[id].title;
      li.onclick = () =>
        location.href = `note-details.html?id=${id}`;
      notesList.appendChild(li);
    });

    return;
  }

  const snap = await getDocs(collection(db, "users", user.uid, "notes"));

  snap.forEach(n => {
    const li = document.createElement("li");
    li.textContent = n.data().title;
    li.onclick = () =>
      location.href = `note-details.html?id=${n.id}`;
    notesList.appendChild(li);
  });
}

/* ======================
   ADD NOTE
====================== */
window.addNote = async () => {

  if (!title.value) return;

  if (isTestMode) {

    const id = Date.now().toString();

    tempNotes[id] = {
      title: title.value,
      content: ""
    };

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
   LOAD NOTE DETAILS
====================== */
async function loadNote() {

  const id = new URLSearchParams(location.search).get("id");

  if (isTestMode) {

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

    if (tempNotes[id]) {
      tempNotes[id].title = title.value;
      tempNotes[id].content = content.value;
    }

  } else {

    await updateDoc(doc(db, "users", user.uid, "notes", id), {
      title: title.value,
      content: content.value
    });

  }

  alert("Saved");
};