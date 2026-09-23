const API_URL = "https://ldmk14lnhb.execute-api.ap-southeast-2.amazonaws.com";
const USER_ID = "user-123";

export async function fetchExpenses() {
  const res = await fetch(`${API_URL}/expenses?userId=${USER_ID}`);
  if (!res.ok) throw new Error("Failed to load expenses");
  return res.json();
}

export async function addExpense(expense) {
  const res = await fetch(`${API_URL}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...expense, userId: USER_ID }),
  });
  if (!res.ok) throw new Error("Failed to save expense");
  return res.json();
}

export async function deleteExpense(expenseId) {
  const res = await fetch(
    `${API_URL}/expenses?userId=${USER_ID}&expenseId=${expenseId}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete expense");
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_URL}/settings?userId=${USER_ID}`);
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

export async function saveSettings(categories, incomes) {
  const res = await fetch(`${API_URL}/settings?userId=${USER_ID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categories, incomes }),
  });
  if (!res.ok) throw new Error("Failed to save settings");
  return res.json();
}