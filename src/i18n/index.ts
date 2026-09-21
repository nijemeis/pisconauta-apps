import { useCallback } from "react";
import { usePrefs } from "@/state/prefs";
import { en } from "./en";
import { es, type Key } from "./es";

export type { Key };

const dictionaries = { "es-PE": es, en } as const;

export function useT() {
  const locale = usePrefs((s) => s.locale);
  return useCallback((key: Key, vars?: Record<string, string | number>) => {
    let s: string = dictionaries[locale][key] ?? es[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  }, [locale]);
}
