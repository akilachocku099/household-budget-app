import { useCallback, useEffect, useState } from "react";
import { initialData } from "../data";
import { fetchExpenses, addExpense, deleteExpense, fetchSettings, saveSettings } from "../aws";
import { cleanBudgetData } from "../lib/budget";

function mapAwsExpense(item) {
  return {
    id: item.expenseId,
    expenseId: item.expenseId,
    date: item.date,
    fortnight: item.fortnight || 1,
    month: item.month || "Jan",
    category: item.category,
    description: item.description || "",
    amount: item.amount,
  };
}

export function useBudgetData() {
  const [settings, setSettings] = useState({
    categories: initialData.categories,
    incomes: initialData.incomes,
    months: initialData.months,
  });
  const [transactions, setTransactions] = useState([]);
  const [cloudStatus, setCloudStatus] = useState("Connecting…");
  const [ready, setReady] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [items, remoteSettings] = await Promise.all([fetchExpenses(), fetchSettings()]);
      setTransactions(items.map(mapAwsExpense));
      if (remoteSettings) {
        setSettings({
          categories: remoteSettings.categories?.length ? remoteSettings.categories : initialData.categories,
          incomes: remoteSettings.incomes?.length ? remoteSettings.incomes : initialData.incomes,
          months: initialData.months,
        });
      } else {
        // First time this user has connected — seed AWS with the defaults
        await saveSettings(initialData.categories, initialData.incomes);
      }
      setCloudStatus("Cloud synced");
    } catch (error) {
      console.error("AWS load failed:", error);
      setCloudStatus("Offline — couldn't reach AWS");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const data = cleanBudgetData({ ...settings, transactions });

  const updateData = async (nextData) => {
    const next = {
      categories: nextData.categories,
      incomes: nextData.incomes,
      months: nextData.months,
    };
    setSettings(next); // update UI immediately
    if (!ready) return;
    setCloudStatus("Saving…");
    try {
      await saveSettings(next.categories, next.incomes);
      setCloudStatus("Cloud synced");
    } catch (error) {
      console.error("AWS settings save failed:", error);
      setCloudStatus("Save failed — check connection");
    }
  };

  const addTransaction = async (tx) => {
    setCloudStatus("Saving…");
    try {
      await addExpense(tx);
      await loadAll();
    } catch (error) {
      console.error("AWS save failed:", error);
      setCloudStatus("Save failed — check connection");
    }
  };

  const removeTransaction = async (id) => {
    setCloudStatus("Deleting…");
    try {
      await deleteExpense(id);
      await loadAll();
    } catch (error) {
      console.error("AWS delete failed:", error);
      setCloudStatus("Delete failed — check connection");
    }
  };

  return { data, cloudStatus, isCloudEnabled: true, updateData, addTransaction, removeTransaction };
}