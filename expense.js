import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

let currentUser = null;
const isTestMode = sessionStorage.getItem("testMode") === "true";
let tempExpenses = JSON.parse(sessionStorage.getItem("tempExpenses") || "{}");

onAuthStateChanged(auth, user => {
  currentUser = isTestMode ? { uid: "test-user" } : user;
  if (!currentUser && !isTestMode) location.href = "index.html";
  init();
});

function init() {
  if (document.getElementById("expenseList")) loadDurations();
  if (document.getElementById("itemsList")) loadItems();
}

/* ================= HELPERS ================= */
async function getExpenseData(id) {
  if (isTestMode) return tempExpenses[id] || { items: [] };
  const snap = await getDoc(doc(db, "users", currentUser.uid, "expenses", id));
  return snap.exists() ? snap.data() : { items: [] };
}

async function saveExpenseData(id, data) {
  if (isTestMode) {
    tempExpenses[id] = data;
    sessionStorage.setItem("tempExpenses", JSON.stringify(tempExpenses));
  } else {
    await setDoc(doc(db, "users", currentUser.uid, "expenses", id), data);
  }
}

/* ================= MAIN LIST PAGE ================= */
window.addDuration = async () => {
  const title = document.getElementById("durationTitle").value.trim();
  if (!title) return;
  await saveExpenseData(title, { items: [] });
  document.getElementById("durationTitle").value = "";
  loadDurations();
};

window.loadDurations = async () => {
  const list = document.getElementById("expenseList");
  list.innerHTML = "";
  let durations = [];
  if (isTestMode) {
    durations = Object.keys(tempExpenses);
  } else {
    const snap = await getDocs(collection(db, "users", currentUser.uid, "expenses"));
    snap.forEach(d => durations.push(d.id));
  }

  durations.forEach(id => {
    const div = document.createElement("div");
    div.className = "box expense-item";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.padding = "0";

    div.innerHTML = `
      <div style="width: 40px;"></div>
      <span onclick="location.href='expense-details.html?id=${encodeURIComponent(id)}'" 
            style="flex:1; text-align: center; font-weight: bold; padding: 15px 0;">
        ${id}
      </span>
      <button onclick="event.stopPropagation(); deleteDuration('${id}')" 
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

window.deleteDuration = async (id) => {
  if (!confirm(`Delete all expenses for ${id}?`)) return;
  if (isTestMode) {
    delete tempExpenses[id];
    sessionStorage.setItem("tempExpenses", JSON.stringify(tempExpenses));
  } else {
    await deleteDoc(doc(db, "users", currentUser.uid, "expenses", id));
  }
  loadDurations();
};

/* ================= DETAILS PAGE ================= */
window.loadItems = async () => {
  const id = new URLSearchParams(location.search).get("id");
  document.getElementById("title").textContent = "💰 " + id;
  const data = await getExpenseData(id);
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
      <span style="flex:1; text-align: center;">
        <b style="color:#add8e6">${item.title}:</b> ${item.amount}
      </span>
      <button onclick="deleteExpenseItem(${index})" 
              style="background:transparent; border:none; cursor:pointer; width: 40px; display:flex; justify-content: center; align-items:center;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#add8e6" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;
    list.appendChild(div);
  });
  document.getElementById("totalDisplay").textContent = `Total Expense: ${total}`;
};

window.addExpenseItem = async () => {
  const id = new URLSearchParams(location.search).get("id");
  const titleInput = document.getElementById("expTitle");
  const amountInput = document.getElementById("expAmount");
  
  if (!titleInput.value || !amountInput.value) return alert("Fill both title and amount");
  
  const data = await getExpenseData(id);
  data.items.push({ title: titleInput.value, amount: amountInput.value });
  await saveExpenseData(id, data);
  
  titleInput.value = "";
  amountInput.value = "";
  loadItems();
};

window.deleteExpenseItem = async (index) => {
  const id = new URLSearchParams(location.search).get("id");
  const data = await getExpenseData(id);
  data.items.splice(index, 1);
  await saveExpenseData(id, data);
  loadItems();
};