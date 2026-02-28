import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

let currentUser = null;
const isTestMode = sessionStorage.getItem("testMode") === "true";
let tempAbsents = JSON.parse(sessionStorage.getItem("tempAbsents") || "{}");

onAuthStateChanged(auth, user => {
  currentUser = isTestMode ? { uid: "test-user" } : user;
  if (!currentUser && !isTestMode) location.href = "index.html";
  init();
});

function init() {
  if (document.getElementById("courseList")) loadCourses();
  if (document.getElementById("dateList")) loadDetails();
}

/* ================= HELPERS ================= */
async function getAbsentData(id) {
  if (isTestMode) return tempAbsents[id] || { dates: [] };
  const snap = await getDoc(doc(db, "users", currentUser.uid, "absents", id));
  return snap.exists() ? snap.data() : { dates: [] };
}

async function saveAbsentData(id, data) {
  if (isTestMode) {
    tempAbsents[id] = data;
    sessionStorage.setItem("tempAbsents", JSON.stringify(tempAbsents));
  } else {
    await setDoc(doc(db, "users", currentUser.uid, "absents", id), data);
  }
}

/* ================= MAIN LIST PAGE ================= */
window.addCourse = async () => {
  const name = document.getElementById("courseName").value.trim();
  if (!name) return;
  await saveAbsentData(name, { dates: [] });
  document.getElementById("courseName").value = "";
  loadCourses();
};

window.loadCourses = async () => {
  const list = document.getElementById("courseList");
  list.innerHTML = "";
  let courses = [];
  if (isTestMode) {
    courses = Object.keys(tempAbsents);
  } else {
    const snap = await getDocs(collection(db, "users", currentUser.uid, "absents"));
    snap.forEach(d => courses.push(d.id));
  }

  courses.forEach(id => {
    const div = document.createElement("div");
    div.className = "box course-item";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.padding = "0";

    div.innerHTML = `
      <div style="width: 40px;"></div>
      <span onclick="location.href='absent-details.html?id=${encodeURIComponent(id)}'" 
            style="flex:1; text-align: center; font-weight: bold; padding: 15px 0;">
        ${id}
      </span>
      <button onclick="event.stopPropagation(); deleteCourse('${id}')" 
              style="background:transparent; border:none; cursor:pointer; width: 40px; display:flex; justify-content: center; align-items:center;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#add8e6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
    `;
    list.appendChild(div);
  });
};

window.deleteCourse = async (id) => {
  if (!confirm(`Delete ${id}?`)) return;
  if (isTestMode) {
    delete tempAbsents[id];
    sessionStorage.setItem("tempAbsents", JSON.stringify(tempAbsents));
  } else {
    await deleteDoc(doc(db, "users", currentUser.uid, "absents", id));
  }
  loadCourses();
};

/* ================= DETAILS PAGE ================= */
window.loadDetails = async () => {
  const id = new URLSearchParams(location.search).get("id");
  document.getElementById("title").textContent = id;
  
  // Update Placeholder
  const dateInput = document.getElementById("absentDate");
  if (dateInput) dateInput.placeholder = "dd-mm-yy";

  const data = await getAbsentData(id);
  const list = document.getElementById("dateList");
  list.innerHTML = "";

  data.dates.forEach((date, index) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.borderBottom = "1px solid #333";
    div.style.padding = "5px 0";

    div.innerHTML = `
      <div style="width: 40px;"></div>
      <span style="flex:1; text-align: center; font-size: 1.1rem;">${date}</span>
      <button onclick="deleteDate(${index})" 
              style="background:transparent; border:none; cursor:pointer; width: 40px; display:flex; justify-content: center; align-items:center;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#add8e6" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;
    list.appendChild(div);
  });
  document.getElementById("totalDisplay").textContent = `Total Absents: ${data.dates.length}`;
};

window.addDate = async () => {
  const id = new URLSearchParams(location.search).get("id");
  const dateVal = document.getElementById("absentDate").value;
  if (!dateVal) return;

  // Split YYYY-MM-DD and rearrange to DD-MM-YY
  const parts = dateVal.split("-");
  const formattedDate = `${parts[2]}-${parts[1]}-${parts[0].slice(-2)}`;

  const data = await getAbsentData(id);
  data.dates.push(formattedDate);
  await saveAbsentData(id, data);
  loadDetails();
};

window.deleteDate = async (index) => {
  const id = new URLSearchParams(location.search).get("id");
  const data = await getAbsentData(id);
  data.dates.splice(index, 1);
  await saveAbsentData(id, data);
  loadDetails();
};