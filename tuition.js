import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc
} from
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

let currentUser = null;

/* ======================
   TEST MODE MEMORY
====================== */
const isTestMode = sessionStorage.getItem("testMode") === "true";
// This pulls the existing session data so it doesn't disappear when you move between pages 
// (like going from the list to the details page).
let tempTuitions = JSON.parse(sessionStorage.getItem("tempTuitions") || "{}");

/* ======================
   AUTH GUARD
====================== */
onAuthStateChanged(auth, user => {

  if (sessionStorage.getItem("testMode") === "true") {
    currentUser = { uid: "test-user" }; // fake user
    init();
    return;
  }

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

  if (isTestMode) {
  tempTuitions[name] = { months: [], showEarning: true };
  // PUSH to session so the details page can see it
  sessionStorage.setItem("tempTuitions", JSON.stringify(tempTuitions));
} else {
    await setDoc(
      doc(db, "users", currentUser.uid, "tuitions", name),
      { months: [], showEarning: true }
    );
  }

  tuitionName.value = "";
  loadTuitions();
};

/* ======================
   LOAD TUITIONS (INSTANT CLICK + BLUE BIN)
====================== */
async function loadTuitions() {
  const list = document.getElementById("tuitionList");
  if (!list) return;
  list.innerHTML = "";

  const processItem = (id) => {
    const div = document.createElement("div");
    div.className = "tuition";
    div.id = `row-${id.replace(/\s+/g, '-')}`; 
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.padding = "0";

    div.innerHTML = `
      <div style="width: 40px;"></div>
      <span onclick="window.location.href='tuition-details.html?id=${encodeURIComponent(id)}'" 
            style="flex:1; cursor:pointer; text-align: center; font-weight: bold; padding: 15px 0; display: block;">
        ${id}
      </span>
      <button onclick="event.stopPropagation(); deleteItem('${id}', 'tuition')" 
              style="background:transparent; border:none; cursor:pointer; width: 40px; display:flex; justify-content: center; align-items:center; padding:0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#add8e6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </button>
    `;
    list.appendChild(div);
  };

  if (isTestMode) {
    Object.keys(tempTuitions).forEach(id => processItem(id));
  } else {
    const snap = await getDocs(collection(db, "users", currentUser.uid, "tuitions"));
    snap.forEach(docSnap => processItem(docSnap.id));
  }
}

/* ======================
   TUITION DETAILS PAGE
====================== */
let tuitionId = null, data = null;

async function loadTuitionDetails() {
  // Fix: The list page sends 'id', so we must get 'id'
  tuitionId = new URLSearchParams(location.search).get("id"); 
  title.textContent = "📘 " + tuitionId;

  // --- ADDED THESE TWO LINES FOR LATEST FIRST ---
  const monthsContainer = document.getElementById("months"); 
  if (monthsContainer) {
    monthsContainer.style.display = "flex";
    monthsContainer.style.flexDirection = "column-reverse";
  }
  // ----------------------------------------------

  if (isTestMode) {
    data = tempTuitions[tuitionId] || { months: [], showEarning: true };
    render();
    return;
  }

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
  if (!val) return;

  // 1. Split the browser's YYYY-MM-DD
  const parts = val.split("-"); 
  
  // 2. Format as DD-MM-YY
  const day = parts[2];
  const month = parts[1];
  const year = parts[0].slice(-2); 
  const formatted = `${day}-${month}-${year}`;

  // 3. Update memory and SAVE immediately
  data.months[m].dates[d] = formatted;
  await save(); // Saves to sessionStorage in Test Mode or Firestore in Firebase
};
window.updateMonth = async function (i) {

  const m = data.months[i];

  m.dates = m.dates.map(d => {

    if (!d) return d;

    const parts = d.split("-");

    // only convert if still yyyy-mm-dd
    if (parts.length === 3 && parts[0].length === 4) {

      return (
        parts[2] + "-" +
        parts[1] + "-" +
        parts[0].slice(-2)
      );

    }

    return d;

  });

  await save();

  render();
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
  if (isTestMode) {
    tempTuitions[tuitionId] = data;
    // This line ensures updates (like dates/earnings) are saved to the session
    sessionStorage.setItem("tempTuitions", JSON.stringify(tempTuitions));
    return;
  }

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

    

    if (data.showEarning) {
      html += `<p>💰 Earning: ${m.earning}</p>`;
    }

    // Create a unique ID for each month row to support the instant hide effect
/* ======================
   STEP 1: ALIGNMENT (Replace inside render loop)
====================== */
const monthId = `month-${i}`; 
const monthDiv = document.createElement("div");
monthDiv.className = "box";
monthDiv.id = `row-${monthId}`;

// Center the content so the button hugs the title in the middle
monthDiv.style.display = "flex";
monthDiv.style.flexDirection = "column";
monthDiv.style.alignItems = "center";
monthDiv.style.padding = "15px";

monthDiv.innerHTML = `
  <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
    <strong style="font-size: 1.1rem;">${m.name}</strong>
    
    <button onclick="deleteMonthRow('${monthId}', ${i})" 
            style="background:transparent; border:none; cursor:pointer; margin-left: 10px; display: flex; align-items: center; padding: 0;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#add8e6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    </button>
  </div>

 <div style="text-align: center; width: 100%;">

  Classes: ${m.classes}<br>
  Total taken: ${m.dates.filter(d => d).length}<br>

  <div style="margin-top:5px;">

  ${m.dates.map((d, j) => {

    let displayVal = "";

    if (d) {

      const p = d.split("-");

      // dd-mm-yy
      if (p.length === 3 && p[0].length === 2) {
        displayVal = `20${p[2]}-${p[1]}-${p[0]}`;
      }

      // mm-dd-yy old
      else if (p.length === 3 && p[1].length === 2) {
        displayVal = `20${p[2]}-${p[0]}-${p[1]}`;
      }

      // yyyy-mm-dd
      else if (p.length === 3 && p[0].length === 4) {
        displayVal = d;
      }

    }

    return `
      <input type="date"
        value="${displayVal}"
        onchange="updateDate(${i},${j},this.value)"
        style="margin:3px; width:48%; display:inline-block;">
    `;

  }).join('')}

  </div>

  ${data.showEarning ? `<p style="margin-top:10px;">💰 Earning: ${m.earning}</p>` : ""}

</div>
`;
months.appendChild(monthDiv);
  });

  total.textContent = data.showEarning
    ? "Total Earning: " + totalEarn
    : "Total Earning: Hidden";
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
/* ===============================
   DELETE INDIVIDUAL MONTH
=============================== */
window.deleteMonthRow = async (elementId, index) => {
  if (!confirm("Are you sure you want to delete this month?")) return;

  // 1. SPEED FIX: Instantly hide the row just like the universal delete
  const rowElement = document.getElementById(`row-${elementId}`);
  if (rowElement) {
    rowElement.style.display = "none";
  }

  // 2. Remove only that specific month from the data array
  data.months.splice(index, 1);

  // 3. Save the update (This works for both Test Mode and Firebase)
  await save();
  
  // 4. Re-render the page to update the total earnings display
  render();
};