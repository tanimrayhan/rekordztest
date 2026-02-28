import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

let currentUser = null;
const isTestMode = sessionStorage.getItem("testMode") === "true";
let tempCgData = JSON.parse(sessionStorage.getItem("tempCgData") || "{}");

onAuthStateChanged(auth, user => {
  currentUser = isTestMode ? { uid: "test-user" } : user;
  if (!currentUser && !isTestMode) location.href = "index.html";
  init();
});

function init() {
  if (document.getElementById("personList")) loadPersons();
  if (document.getElementById("semList")) loadSemesters();
  if (document.getElementById("courseList")) loadCourses();
}

/* ================= HELPERS ================= */
async function getPersonData(id) {
  if (isTestMode) return tempCgData[id] || { semesters: {} };
  const snap = await getDoc(doc(db, "users", currentUser.uid, "cgpa", id));
  return snap.exists() ? snap.data() : { semesters: {} };
}

async function savePersonData(id, data) {
  if (isTestMode) {
    tempCgData[id] = data;
    sessionStorage.setItem("tempCgData", JSON.stringify(tempCgData));
  } else {
    await setDoc(doc(db, "users", currentUser.uid, "cgpa", id), data);
  }
}

function calculateGPA(courses) {
  let points = 0, credits = 0;
  courses.forEach(c => { points += (c.gpa * c.credits); credits += c.credits; });
  return credits > 0 ? (points / credits).toFixed(2) : "0.00";
}

/* ================= PERSONS PAGE ================= */
window.addPerson = async () => {
  const name = document.getElementById("personName").value.trim();
  if (!name) return;
  const data = { semesters: {} };
  await savePersonData(name, data);
  loadPersons();
};

async function loadPersons() {
  const list = document.getElementById("personList");
  list.innerHTML = "";
  let names = isTestMode ? Object.keys(tempCgData) : [];
  if (!isTestMode) {
    const snap = await getDocs(collection(db, "users", currentUser.uid, "cgpa"));
    snap.forEach(d => names.push(d.id));
  }
  
  names.forEach(id => {
    const div = document.createElement("div");
    div.className = "box person-item";
    // Matching your Notes CSS logic
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.padding = "0";

    div.innerHTML = `
      <div style="width: 40px;"></div>
      <span onclick="location.href='cg-semesters.html?person=${encodeURIComponent(id)}'" 
            style="flex:1; cursor:pointer; text-align: center; font-weight: bold; padding: 15px 0; display: block;">
        ${id}
      </span>
      <button onclick="event.stopPropagation(); deletePerson('${id}')" 
              style="background:transparent; border:none; cursor:pointer; width: 40px; display:flex; justify-content: center; align-items:center; padding:0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#add8e6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
    `;
    list.appendChild(div);
  });
}

// Add the delete logic if you haven't already
window.deletePerson = async (id) => {
  if (!confirm(`Delete all data for ${id}?`)) return;
  if (isTestMode) {
    delete tempCgData[id];
    sessionStorage.setItem("tempCgData", JSON.stringify(tempCgData));
  } else {
    // You'll need to import deleteDoc and doc if not available in scope
    const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
    await deleteDoc(doc(db, "users", currentUser.uid, "cgpa", id));
  }
  loadPersons();
};

/* ================= SEMESTERS PAGE ================= */
window.addSemester = async () => {
  const person = new URLSearchParams(location.search).get("person");
  const name = document.getElementById("semName").value.trim();
  if (!name) return;
  const data = await getPersonData(person);
  data.semesters[name] = { courses: [] };
  await savePersonData(person, data);
  loadSemesters();
};

async function loadSemesters() {
  const person = new URLSearchParams(location.search).get("person");
  document.getElementById("personTitle").textContent = person;
  const data = await getPersonData(person);
  const list = document.getElementById("semList");
  list.innerHTML = "";
  
  let chartLabels = [], chartPoints = [];

  Object.keys(data.semesters).forEach(sem => {
    const gpa = calculateGPA(data.semesters[sem].courses);
    chartLabels.push(sem);
    chartPoints.push(gpa);

    const div = document.createElement("div");
    div.className = "box person-item";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.padding = "0";

    div.innerHTML = `
      <div style="width: 40px;"></div>
      <div onclick="location.href='cg-courses.html?person=${encodeURIComponent(person)}&sem=${encodeURIComponent(sem)}'" 
           style="flex:1; cursor:pointer; text-align: center; padding: 15px 0;">
        <span style="font-weight:bold;">${sem}</span> 
        <span style="color:#add8e6; margin-left:5px;">(GPA: ${gpa})</span>
      </div>
      <button onclick="event.stopPropagation(); deleteSemester('${person}', '${sem}')" 
              style="background:transparent; border:none; cursor:pointer; width: 40px; display:flex; justify-content: center; align-items:center; padding:0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#add8e6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
    `;
    list.appendChild(div);
  });
  renderChart(chartLabels, chartPoints);
}

/* ================= COURSES PAGE ================= */
window.addCourse = async () => {
  const params = new URLSearchParams(location.search);
  const person = params.get("person");
  const sem = params.get("sem");
  const title = document.getElementById("courseTitle").value;
  const creds = parseFloat(document.getElementById("credits").value);
  const g = parseFloat(document.getElementById("gpa").value);

  if (!title || isNaN(creds) || isNaN(g)) return;

  const data = await getPersonData(person);
  data.semesters[sem].courses.push({ title, credits: creds, gpa: g });
  await savePersonData(person, data);
  loadCourses();
};

async function loadCourses() {
  const params = new URLSearchParams(location.search);
  const person = params.get("person");
  const sem = params.get("sem");
  document.getElementById("semTitle").textContent = sem;
  
  const data = await getPersonData(person);
  const list = document.getElementById("courseList");
  list.innerHTML = "";

  let totalPoints = 0, totalCredits = 0;

  Object.keys(data.semesters).forEach(sName => {
    data.semesters[sName].courses.forEach((c, index) => {
      totalPoints += (c.gpa * c.credits);
      totalCredits += c.credits;
      
      if(sName === sem) {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.borderBottom = "1px solid #333";
        div.style.padding = "5px 0";

        div.innerHTML = `
          <div style="width: 40px;"></div>
          <span style="flex:1; text-align: center;">
            ${c.title} (${c.credits}) — <b style="color:#add8e6">${c.gpa}</b>
          </span>
          <button onclick="deleteCourse('${person}', '${sem}', ${index})" 
                  style="background:transparent; border:none; cursor:pointer; width: 40px; display:flex; justify-content: center; align-items:center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#add8e6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        `;
        list.appendChild(div);
      }
    });
  });

  document.getElementById("semCg").textContent = `Semester GPA: ${calculateGPA(data.semesters[sem].courses)}`;
  document.getElementById("overallCgDisplay").textContent = `Overall CGPA: ${totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00"}`;
}

function renderChart(labels, points) {
  const canvas = document.getElementById('cgChart');
  if (!canvas) return;
  new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{ label: 'GPA', data: points, borderColor: '#0099ff', backgroundColor: 'rgba(0,153,255,0.1)', fill: true, tension: 0.3 }]
    },
    options: { scales: { y: { min: 0, max: 4 } } }
  });
}