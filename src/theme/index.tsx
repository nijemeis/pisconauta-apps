import { createContext, useContext } from "react";
import { usePrefs } from "@/state/prefs";
import { themes, type ThemeName, type Tokens } from "./tokens";

export * from "./tokens";

const Forced = createContext<ThemeName | null>(null);

/** Pins a subtree to one palette (the scanner and splash are always dark). */
export function ThemeScope({ name, children }: { name: ThemeName; children: React.ReactNode }) {
  return <Forced.Provider value={name}>{children}</Forced.Provider>;
}

export function useTheme(): Tokens {
  const forced = useContext(Forced);
  const pref = usePrefs((s) => s.theme);
  return themes[forced ?? pref];
}
