import { useState, useEffect } from "react";

export type HistoryEntryType = "validation" | "generation";

export interface HistoryEntry {
  id: string;
  type: HistoryEntryType;
  date: string;
  module?: string;
  score?: number;
  preview: string;
  extractedFieldsCount: number;
  fullContent?: string;
}

const HISTORY_KEY = "doc-validator-history";

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  const addEntry = (entry: Omit<HistoryEntry, "id" | "date">) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };
    
    setHistory((prev) => {
      const newHistory = [newEntry, ...prev].slice(0, 50); // Keep last 50
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  return { history, addEntry, clearHistory };
}
