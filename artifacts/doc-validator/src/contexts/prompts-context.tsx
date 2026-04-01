import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-context";

type PromptsContextType = {
  prompts: string[];
  add: (text: string) => void;
  remove: (idx: number) => void;
};

const PromptsContext = createContext<PromptsContextType>({
  prompts: [],
  add: () => {},
  remove: () => {},
});

export function PromptsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const key = `custom_prompts_${user?.email ?? "guest"}`;

  const [prompts, setPrompts] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setPrompts(raw ? JSON.parse(raw) : []);
    } catch {
      setPrompts([]);
    }
  }, [key]);

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(prompts)); } catch {}
  }, [prompts, key]);

  const add = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setPrompts((prev) => [...prev, t]);
  };

  const remove = (idx: number) =>
    setPrompts((prev) => prev.filter((_, i) => i !== idx));

  return (
    <PromptsContext.Provider value={{ prompts, add, remove }}>
      {children}
    </PromptsContext.Provider>
  );
}

export const usePrompts = () => useContext(PromptsContext);
