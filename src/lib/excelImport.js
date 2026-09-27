import * as XLSX from "xlsx";

export function parseTransactionsFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheet = workbook.Sheets["FortnightlyLog"];
        if (!sheet) {
          reject(new Error('No "FortnightlyLog" sheet found in this file.'));
          return;
        }

        // Row layout (data starts after title/instructions/header rows): [Date, Fortnight#, Month, Category, Description, Amount]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 5 });

        const transactions = rows
          .filter((r) => r[0] && r[5] != null && r[5] !== "")
          .map((r) => ({
            date: r[0] instanceof Date ? r[0].toISOString().slice(0, 10) : String(r[0]).slice(0, 10),
            fortnight: Number(r[1]) || 1,
            month: r[2],
            category: r[3],
            description: r[4] || "",
            amount: Number(r[5]),
          }));

        if (!transactions.length) {
          reject(new Error("No transactions found in the file — check it matches the expected format."));
          return;
        }

        resolve(transactions);
      } catch (err) {
        reject(new Error("Could not read this file. Make sure it's a valid .xlsx export of the budget template."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsArrayBuffer(file);
  });
}