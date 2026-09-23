import { initialData } from "../data";

export const MONTHS = initialData.months;

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export const formatPercent = (value) => `${Math.round(Number(value || 0) * 100)}%`;

export const getCurrentMonth = () => MONTHS[new Date().getMonth()] || "Jan";

export const getMonthIndex = (month) => MONTHS.indexOf(month);

export function cleanBudgetData(value) {
  const source = value && typeof value === "object" ? value : initialData;

  return {
    ...initialData,
    ...source,
    incomes: (source.incomes || initialData.incomes || []).filter(
      (income) => income.name !== "Total Income",
    ),
    categories: Array.isArray(source.categories)
      ? source.categories
      : initialData.categories,
    transactions: Array.isArray(source.transactions)
      ? source.transactions
      : initialData.transactions,
    months: Array.isArray(source.months) ? source.months : initialData.months,
  };
}

export function calculateMetrics(data, selectedMonth) {
  const incomeSources = data.incomes.filter(
    (income) => income.name !== "Total Income",
  );
  const currentTransactions = data.transactions.filter(
    (transaction) => transaction.month === selectedMonth,
  );
  const annualIncome = incomeSources.reduce(
    (total, income) =>
      total + MONTHS.reduce((monthTotal, month) => monthTotal + (income.months[month] || 0), 0),
    0,
  );
  const annualExpenses = data.transactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  const incomeCurrent = incomeSources.reduce(
    (total, income) => total + (income.months[selectedMonth] || 0),
    0,
  );
  const currentExpenses = currentTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );

  return {
    annualIncome,
    annualExpenses,
    net: annualIncome - annualExpenses,
    incomeCurrent,
    currentExpenses,
    savingsCurrent: incomeCurrent - currentExpenses,
    current: currentTransactions,
    categorySpend: data.categories.map((category) => ({
      ...category,
      budget: category.monthlyBudget || 0,
      actual: currentTransactions
        .filter((transaction) => transaction.category === category.name)
        .reduce((total, transaction) => total + transaction.amount, 0),
    })),
  };
}

export function createMonthlySeries(data) {
  return MONTHS.map((month) => ({
    month,
    expenses: data.transactions
      .filter((transaction) => transaction.month === month)
      .reduce((total, transaction) => total + transaction.amount, 0),
    income: data.incomes
      .filter((income) => income.name !== "Total Income")
      .reduce((total, income) => total + (income.months[month] || 0), 0),
  }));
}
