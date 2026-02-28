import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc
} from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

let user, courseId, marks = [], chart;

/* ===============================
   TEST MODE MEMORY (LIKE TUITION)
=============================== */
const isTestMode = sessionStorage.getItem("testMode") === "true";

let tempCourses =
  JSON.parse(sessionStorage.getItem("tempCTCourses")) || {};

/* ===============================
   AUTH CHECK
=============================== */
onAuthStateChanged(auth, u => {

  if (sessionStorage.getItem("testMode") === "true") {
    user = { uid: "test-user" }; // fake user
    init();
    return;
  }

  if (!u) location.href = "index.html";
  user = u;
  init();
});

/* ===============================
   INITIALIZER
=============================== */
function init() {

  // Only load course list if we are in ct.html
  const courseListElement = document.getElementById("courseList");
  if (courseListElement) loadCourses();

  // Only load details if we are in ct-details.html
  const inputsBoxElement = document.getElementById("inputsBox");
  if (inputsBoxElement) loadDetails();
}

/* ===============================
   ADD COURSE
=============================== */
window.addCourse = async () => {

  if (!courseName.value || !ctCount.value) return;

  if (isTestMode) {

    tempCourses[courseName.value] = {
      ctCount: Number(ctCount.value),
      marks: []
    };

    sessionStorage.setItem(
      "tempCTCourses",
      JSON.stringify(tempCourses)
    );

  } else {

    await setDoc(
      doc(db, "users", user.uid, "ctCourses", courseName.value),
      { ctCount: Number(ctCount.value), marks: [] }
    );

  }

  courseName.value = "";
  ctCount.value = "";

  loadCourses(); // refresh list inside existing box
};

/* ===============================
   LOAD COURSES (INSTANT CLICK)
=============================== */
async function loadCourses() {
  const list = document.getElementById("courseList");
  list.innerHTML = "";

  const processItem = (id) => {
    const div = document.createElement("div");
    div.className = "tuition";
    div.id = `row-${id.replace(/\s+/g, '-')}`; 
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.padding = "0"; // Remove padding from container to make span fill it

    div.innerHTML = `
      <div style="width: 40px;"></div> 
      
      <span onclick="window.location.href='ct-details.html?course=${encodeURIComponent(id)}'" 
            style="flex:1; cursor:pointer; text-align: center; font-weight: bold; padding: 15px 0; display: block;">
        ${id}
      </span>

      <button onclick="event.stopPropagation(); deleteItem('${id}', 'ct')" 
              style="background:transparent; border:none; cursor:pointer; width: 40px; display:flex; justify-content: center; align-items:center; padding:0; height: 100%;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#add8e6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </button>
    `;
    list.appendChild(div);
  };

  if (isTestMode) {
    tempCourses = JSON.parse(sessionStorage.getItem("tempCTCourses")) || {};
    Object.keys(tempCourses).forEach(id => processItem(id));
  } else {
    const snap = await getDocs(collection(db, "users", user.uid, "ctCourses"));
    snap.forEach(docSnap => processItem(docSnap.id));
  }
}
/* ===============================
   LOAD COURSE DETAILS (Updated)
=============================== */
async function loadDetails() {
  courseId = new URLSearchParams(location.search).get("course");
  const courseTitle = document.getElementById("courseTitle");
  const inputsBox = document.getElementById("inputsBox");
  const ctChart = document.getElementById("ctChart");

  courseTitle.textContent = courseId;

  if (isTestMode) {
    tempCourses = JSON.parse(sessionStorage.getItem("tempCTCourses")) || {};
    const data = tempCourses[courseId] || { ctCount: 0, marks: [] };
    marks = data.marks.length ? data.marks : Array(data.ctCount).fill(0);
  } else {
    const ref = doc(db, "users", user.uid, "ctCourses", courseId);
    const data = (await getDoc(ref)).data();
    marks = data.marks.length ? data.marks : Array(data.ctCount).fill(0);
  }

  // 1. ADDED NUMBERING (CT 1, CT 2...) to the input rows
  inputsBox.innerHTML = "";
  marks.forEach((m, i) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.gap = "10px";
    div.style.marginBottom = "8px";
    div.innerHTML = `
      <span style="min-width: 40px;">CT ${i+1}</span>
      <input type="number" value="${m}" placeholder="0" style="flex: 1;">
    `;
    inputsBox.appendChild(div);
  });

  // 2. INITIAL RESULT CALCULATION
  calculateBestOf(marks);

  const ctx = ctChart.getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: marks.map((_, i) => `CT ${i+1}`),
      datasets: [{
        label: "Ct progress Visualization", // 3. FIXED 'undefined' LABEL
        data: marks,
        borderWidth: 2,
        borderColor: '#0099ff'
      }]
    }
  });
}

/* ===============================
   SAVE CT MARKS & RECALCULATE
=============================== */
window.saveCT = async () => {
  const inputsBox = document.getElementById("inputsBox");
  marks = [...inputsBox.querySelectorAll("input")].map(i => +i.value || 0);

  if (isTestMode) {
    tempCourses = JSON.parse(sessionStorage.getItem("tempCTCourses")) || {};
    tempCourses[courseId].marks = marks;
    sessionStorage.setItem("tempCTCourses", JSON.stringify(tempCourses));
  } else {
    await setDoc(
      doc(db, "users", user.uid, "ctCourses", courseId),
      { marks },
      { merge: true }
    );
  }

  chart.data.datasets[0].data = marks;
  chart.update();
  
  // 4. UPDATE CALCULATION ON SAVE
  calculateBestOf(marks);
  alert("Saved!");
};

/* ===============================
   NEW LOGIC: BEST OF (N-1)
=============================== */
function calculateBestOf(marksArray) {
  const resultBox = document.getElementById("resultBox");
  if (!resultBox || marksArray.length === 0) return;

  const n = marksArray.length;
  // If only 1 CT exists, just show that mark. Otherwise, Best of (N-1)
  const countToTake = n > 1 ? n - 1 : 1;
  
  // Sort marks descending and take the top (N-1)
  const sorted = [...marksArray].sort((a, b) => b - a);
  const bestMarks = sorted.slice(0, countToTake);
  const total = bestMarks.reduce((sum, val) => sum + val, 0);

  resultBox.innerHTML = `Best of ${countToTake} Total: ${total}`;
}
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