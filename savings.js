import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

let currentUser = null;
const isTestMode = sessionStorage.getItem("testMode") === "true";
let tempSavings = JSON.parse(sessionStorage.getItem("tempSavings") || "{}");

onAuthStateChanged(auth, user => {
  currentUser = isTestMode ? { uid: "test-user" } : user;
  if (!currentUser && !isTestMode) location.href = "index.html";
  init();
});

function init() {
  if (document.getElementById("savingsList")) loadDurations();
  if (document.getElementById("itemsList")) loadItems();
}

/* ================= HELPERS ================= */
async function getSavingsData(id) {
  if (isTestMode) return tempSavings[id] || { items: [], goal: 0 };
  const snap = await getDoc(doc(db, "users", currentUser.uid, "savings", id));
  return snap.exists() ? snap.data() : { items: [], goal: 0 };
}

async function saveSavingsData(id, data) {
  if (isTestMode) {
    tempSavings[id] = data;
    sessionStorage.setItem("tempSavings", JSON.stringify(tempSavings));
  } else {
    await setDoc(doc(db, "users", currentUser.uid, "savings", id), data);
  }
}

/* ================= MAIN LIST PAGE ================= */
window.addDuration = async () => {
  const title = document.getElementById("durationTitle").value.trim();
  if (!title) return;
  await saveSavingsData(title, { items: [], goal: 0 });
  document.getElementById("durationTitle").value = "";
  loadDurations();
};

window.loadDurations = async () => {
  const list = document.getElementById("savingsList");
  list.innerHTML = "";
  let durations = isTestMode ? Object.keys(tempSavings) : [];
  
  if (!isTestMode) {
    const snap = await getDocs(collection(db, "users", currentUser.uid, "savings"));
    snap.forEach(d => durations.push(d.id));
  }

  durations.forEach(id => {
    const div = document.createElement("div");
    div.className = "box savings-item";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.padding = "0";
    div.innerHTML = `
      <div style="width: 40px;"></div>
      <span onclick="location.href='savings-details.html?id=${encodeURIComponent(id)}'" 
            style="flex:1; text-align: center; font-weight: bold; padding: 15px 0;">
        ${id}
      </span>
      <button onclick="event.stopPropagation(); deleteDuration('${id}')" 
              style="background:transparent; border:none; cursor:pointer; width: 40px; display:flex; justify-content: center; align-items:center;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#add8e6" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
    `;
    list.appendChild(div);
  });
};

window.deleteDuration = async (id) => {
  if (!confirm(`Delete records for ${id}?`)) return;
  if (isTestMode) {
    delete tempSavings[id];
    sessionStorage.setItem("tempSavings", JSON.stringify(tempSavings));
  } else {
    await deleteDoc(doc(db, "users", currentUser.uid, "savings", id));
  }
  loadDurations();
};

/* ================= DETAILS PAGE ================= */
window.loadItems = async () => {
  const id = new URLSearchParams(location.search).get("id");
  document.getElementById("title").textContent = id;
  const data = await getSavingsData(id);
  const list = document.getElementById("itemsList");
  list.innerHTML = "";
  
  let total = 0;
  data.items.forEach((item, index) => {
    total += Number(item.amount || 0);
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.borderBottom = "1px solid #333";
    div.style.padding = "10px 0";
    div.innerHTML = `
      <div style="width: 40px;"></div>
      <span style="flex:1; text-align: center;"><b style="color:#add8e6">${item.title}:</b> ${item.amount}</span>
      <button onclick="deleteSavingsItem(${index})" style="background:transparent; border:none; cursor:pointer; width: 40px; display:flex; justify-content: center;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#add8e6" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;
    list.appendChild(div);
  });

  const goal = Number(data.goal || 0);
  const remaining = goal - total;

  document.getElementById("totalDisplay").textContent = `Total Savings: ${total}`;
  document.getElementById("goalDisplay").textContent = `Goal: ${goal}`;
  
  const remEl = document.getElementById("remainingDisplay");
  if (remaining <= 0 && goal > 0) {
    remEl.textContent = "Goal Achieved! 🎉";
    remEl.style.color = "#aaffaa";
  } else {
    remEl.textContent = `Remaining: ${remaining < 0 ? 0 : remaining}`;
    remEl.style.color = "#ff9999";
  }
};

window.updateGoal = async () => {
  const id = new URLSearchParams(location.search).get("id");
  const goalVal = document.getElementById("goalAmount").value;
  if (!goalVal) return;
  const data = await getSavingsData(id);
  data.goal = goalVal;
  await saveSavingsData(id, data);
  loadItems();
};

window.addSavingsItem = async () => {
  const id = new URLSearchParams(location.search).get("id");
  const t = document.getElementById("savTitle");
  const a = document.getElementById("savAmount");
  if (!t.value || !a.value) return;
  const data = await getSavingsData(id);
  data.items.push({ title: t.value, amount: a.value });
  await saveSavingsData(id, data);
  t.value = ""; a.value = "";
  loadItems();
};

window.deleteSavingsItem = async (index) => {
  const id = new URLSearchParams(location.search).get("id");
  const data = await getSavingsData(id);
  data.items.splice(index, 1);
  await saveSavingsData(id, data);
  loadItems();
};