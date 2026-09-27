// Uploads your Excel budget data to your live AWS API (Lambda + DynamoDB).
// Usage:
//   1. npm install xlsx
//   2. Put Household_Budget_Tool.xlsx in the same folder as this script
//   3. node migrate-data.mjs

import xlsx from "xlsx";

const API_URL = "https://ldmk14lnhb.execute-api.ap-southeast-2.amazonaws.com";
const USER_ID = "user-123";
const FILE_PATH = "./Household_Budget_Tool.xlsx";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const workbook = xlsx.readFile(FILE_PATH, { cellDates: true });

// ---- FortnightlyLog -> transactions ----
// Row layout: [Date, Fortnight#, Month, Category, Description, Amount]
const logRows = xlsx.utils.sheet_to_json(workbook.Sheets["FortnightlyLog"], {
  header: 1,
  range: 5,
});

const transactions = logRows
  .filter((r) => r[0] && r[5] != null && r[5] !== "")
  .map((r) => ({
    date: r[0] instanceof Date ? r[0].toISOString().slice(0, 10) : String(r[0]).slice(0, 10),
    fortnight: Number(r[1]) || 1,
    month: r[2],
    category: r[3],
    description: r[4] || "",
    amount: Number(r[5]),
  }));

// ---- BudgetCategories -> categories ----
// Row layout: [Category, Type, Monthly Budget, Annual Budget]
const catRows = xlsx.utils.sheet_to_json(workbook.Sheets["BudgetCategories"], {
  header: 1,
  range: 5,
});

const categories = catRows
  .filter((r) => r[0] && r[0] !== "Total")
  .map((r) => ({
    name: r[0],
    type: r[1],
    monthlyBudget: Number(r[2]) || 0,
  }));

// ---- Income -> incomes ----
// Row layout: [Source, Jan..Dec, Annual]
const incRows = xlsx.utils.sheet_to_json(workbook.Sheets["Income"], {
  header: 1,
  range: 5,
});

const incomes = incRows
  .filter((r) => r[0] && r[0] !== "Total Income")
  .map((r) => ({
    name: r[0],
    months: Object.fromEntries(MONTHS.map((m, i) => [m, Number(r[1 + i]) || 0])),
  }));

async function main() {
  console.log(`Found ${transactions.length} transactions, ${categories.length} categories, ${incomes.length} income sources.`);

  console.log("Uploading transactions...");
  let ok = 0;
  let failed = 0;
  for (const tx of transactions) {
    try {
      const res = await fetch(`${API_URL}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tx, userId: USER_ID }),
      });
      if (res.ok) {
        ok++;
      } else {
        failed++;
        console.error("Failed row:", tx, await res.text());
      }
    } catch (err) {
      failed++;
      console.error("Network error on row:", tx, err.message);
    }
  }
  console.log(`Transactions uploaded: ${ok} succeeded, ${failed} failed.`);

  console.log("Uploading categories + income to /settings...");
  const settingsRes = await fetch(`${API_URL}/settings?userId=${USER_ID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categories, incomes }),
  });
  console.log(settingsRes.ok ? "Settings saved successfully." : `Settings failed: ${await settingsRes.text()}`);

  console.log("Done. Refresh your app to see the data.");
}

main();
