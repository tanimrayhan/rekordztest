import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, setDoc
} from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

let user, courseId, marks = [], chart;

onAuthStateChanged(auth, u => {
  if (!u) location.href = "index.html";
  user = u;
  init();
});

function init() {
  if (courseList) loadCourses();
  if (inputsBox) loadDetails();
}

window.addCourse = async () => {
  await setDoc(
    doc(db, "users", user.uid, "ctCourses", courseName.value),
    { ctCount: Number(ctCount.value), marks: [] }
  );
  loadCourses();
};

async function loadCourses() {
  courseList.innerHTML = "";
  const snap = await getDocs(collection(db, "users", user.uid, "ctCourses"));
  snap.forEach(d => {
    const div = document.createElement("div");
    div.className = "tuition";
    div.textContent = d.id;
    div.onclick = () => location.href = `ct-details.html?course=${d.id}`;
    courseList.appendChild(div);
  });
}

async function loadDetails() {
  courseId = new URLSearchParams(location.search).get("course");
  courseTitle.textContent = courseId;

  const ref = doc(db, "users", user.uid, "ctCourses", courseId);
  const data = (await getDoc(ref)).data();

  marks = data.marks.length
    ? data.marks
    : Array(data.ctCount).fill(0);

  inputsBox.innerHTML = "";
  marks.forEach((m, i) =>
    inputsBox.innerHTML += `<input type="number" value="${m}">`
  );

  const ctx = ctChart.getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: marks.map((_, i) => `CT ${i+1}`),
      datasets: [{ data: marks, borderWidth: 2 }]
    }
  });
}

window.saveCT = async () => {
  marks = [...inputsBox.querySelectorAll("input")].map(i => +i.value || 0);
  await setDoc(
    doc(db, "users", user.uid, "ctCourses", courseId),
    { marks },
    { merge: true }
  );
  chart.data.datasets[0].data = marks;
  chart.update();
};
