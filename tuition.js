import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, setDoc
} from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

let currentUser = null;

/* ======================
   AUTH GUARD
====================== */
onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "index.html";
  } else {
    currentUser = user;
    init();
  }
});

/* ======================
   PAGE DETECTION
====================== */
function init() {
  if (document.getElementById("tuitionList")) loadTuitions();
  if (document.getElementById("months")) loadTuitionDetails();
}

/* ======================
   TUITION LIST PAGE
====================== */
window.addTuition = async function () {
  const name = tuitionName.value.trim();
  if (!name) return alert("Enter tuition name");

  await setDoc(
    doc(db, "users", currentUser.uid, "tuitions", name),
    { months: [], showEarning: true }
  );

  tuitionName.value = "";
  loadTuitions();
};

async function loadTuitions() {
  tuitionList.innerHTML = "";
  const snap = await getDocs(
    collection(db, "users", currentUser.uid, "tuitions")
  );

  snap.forEach(t => {
    const div = document.createElement("div");
    div.className = "tuition";
    div.textContent = "📘 " + t.id;
    div.onclick = () =>
      location.href = `tuition-details.html?name=${t.id}`;
    tuitionList.appendChild(div);
  });
}

/* ======================
   TUITION DETAILS PAGE
====================== */
let tuitionId = null, data = null;

async function loadTuitionDetails() {
  tuitionId = new URLSearchParams(location.search).get("name");
  title.textContent = "📘 " + tuitionId;

  const ref = doc(db, "users", currentUser.uid, "tuitions", tuitionId);
  const snap = await getDoc(ref);

  data = snap.exists()
    ? snap.data()
    : { months: [], showEarning: true };

  render();
}

/* ======================
   ADD MONTH
====================== */
window.addMonth = async function () {
  if (!monthName.value || !classCount.value)
    return alert("Fill all fields");

  data.months.push({
    name: monthName.value,
    classes: Number(classCount.value),
    dates: Array(Number(classCount.value)).fill(""),
    earning: Number(earning.value || 0)
  });

  await save();
  monthName.value = classCount.value = earning.value = "";
  render();
};

/* ======================
   UPDATE DATE
====================== */
window.updateDate = async function (m, d, val) {
  data.months[m].dates[d] = val;
  await save();
};

/* ======================
   TOGGLE EARNING
====================== */
window.toggleEarning = async function () {
  data.showEarning = !data.showEarning;
  await save();
  render();
};

/* ======================
   SAVE
====================== */
async function save() {
  await setDoc(
    doc(db, "users", currentUser.uid, "tuitions", tuitionId),
    data
  );
}

/* ======================
   RENDER
====================== */
function render() {
  months.innerHTML = "";
  let totalEarn = 0;

  data.months.forEach((m, i) => {
    totalEarn += m.earning;

    let html = `<strong>${m.name}</strong><br>
                Classes: ${m.classes}<br>`;

    m.dates.forEach((d, j) => {
      html += `
        <input type="date"
          value="${d}"
          onchange="updateDate(${i},${j},this.value)">
      `;
    });

    if (data.showEarning) {
      html += `<p>💰 Earning: ${m.earning}</p>`;
    }

    months.innerHTML += `<div class="box">${html}</div>`;
  });

  total.textContent = data.showEarning
    ? "Total Earning: " + totalEarn
    : "Total Earning: Hidden";
}
