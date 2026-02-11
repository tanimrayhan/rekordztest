import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  collection, addDoc, doc, getDoc, getDocs, updateDoc
} from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

let user = null;

onAuthStateChanged(auth, u => {
  if (!u) location.href = "index.html";
  user = u;
  init();
});

function init() {
  if (notesList) loadNotes();
  if (content) loadNote();
}

async function loadNotes() {
  notesList.innerHTML = "";
  const snap = await getDocs(collection(db, "users", user.uid, "notes"));
  snap.forEach(n => {
    const li = document.createElement("li");
    li.textContent = n.data().title;
    li.onclick = () => location.href = `note-details.html?id=${n.id}`;
    notesList.appendChild(li);
  });
}

window.addNote = async () => {
  if (!title.value) return;
  await addDoc(collection(db, "users", user.uid, "notes"), {
    title: title.value,
    content: ""
  });
  title.value = "";
  loadNotes();
};

async function loadNote() {
  const id = new URLSearchParams(location.search).get("id");
  const snap = await getDoc(doc(db, "users", user.uid, "notes", id));
  title.value = snap.data().title;
  content.value = snap.data().content;
}

window.saveNote = async () => {
  const id = new URLSearchParams(location.search).get("id");
  await updateDoc(doc(db, "users", user.uid, "notes", id), {
    title: title.value,
    content: content.value
  });
  alert("Saved");
};
