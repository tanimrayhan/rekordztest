import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, setDoc
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
   LOAD COURSES
=============================== */
async function loadCourses() {

  const courseList = document.getElementById("courseList");
  courseList.innerHTML = "";

  if (isTestMode) {

    tempCourses =
      JSON.parse(sessionStorage.getItem("tempCTCourses")) || {};

    Object.keys(tempCourses).forEach(name => {

      const div = document.createElement("div");
      div.className = "tuition";
      div.textContent = name;

      div.onclick = () =>
        location.href = `ct-details.html?course=${name}`;

      courseList.appendChild(div);
    });

    return;
  }

  const snap = await getDocs(
    collection(db, "users", user.uid, "ctCourses")
  );

  snap.forEach(d => {

    const div = document.createElement("div");
    div.className = "tuition";
    div.textContent = d.id;

    div.onclick = () =>
      location.href = `ct-details.html?course=${d.id}`;

    courseList.appendChild(div);
  });
}

/* ===============================
   LOAD COURSE DETAILS
=============================== */
async function loadDetails() {

  courseId = new URLSearchParams(location.search).get("course");

  const courseTitle = document.getElementById("courseTitle");
  const inputsBox = document.getElementById("inputsBox");
  const ctChart = document.getElementById("ctChart");

  courseTitle.textContent = courseId;

  if (isTestMode) {

    tempCourses =
      JSON.parse(sessionStorage.getItem("tempCTCourses")) || {};

    const data = tempCourses[courseId] || {
      ctCount: 0,
      marks: []
    };

    marks = data.marks.length
      ? data.marks
      : Array(data.ctCount).fill(0);

  } else {

    const ref = doc(db, "users", user.uid, "ctCourses", courseId);
    const data = (await getDoc(ref)).data();

    marks = data.marks.length
      ? data.marks
      : Array(data.ctCount).fill(0);
  }

  inputsBox.innerHTML = "";

  marks.forEach((m, i) => {
    inputsBox.innerHTML +=
      `<input type="number" value="${m}" placeholder="CT ${i+1}">`;
  });

  const ctx = ctChart.getContext("2d");

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: marks.map((_, i) => `CT ${i+1}`),
      datasets: [{
        data: marks,
        borderWidth: 2
      }]
    }
  });
}

/* ===============================
   SAVE CT MARKS
=============================== */
window.saveCT = async () => {

  const inputsBox = document.getElementById("inputsBox");

  marks = [...inputsBox.querySelectorAll("input")]
    .map(i => +i.value || 0);

  if (isTestMode) {

    tempCourses =
      JSON.parse(sessionStorage.getItem("tempCTCourses")) || {};

    tempCourses[courseId].marks = marks;

    sessionStorage.setItem(
      "tempCTCourses",
      JSON.stringify(tempCourses)
    );

  } else {

    await setDoc(
      doc(db, "users", user.uid, "ctCourses", courseId),
      { marks },
      { merge: true }
    );

  }

  chart.data.datasets[0].data = marks;
  chart.update();
};