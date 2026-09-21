import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { create } from "zustand";
import { api, setApiLocale } from "@/api/client";
import type { Currency, Rates } from "@/api/types";
import type { ThemeName } from "@/theme/tokens";

export type Locale = "es-PE" | "en";

const KEY = "pisconauta.prefs.v1";

/** Countries that use the euro (ISO 3166 alpha-2). */
const EURO_REGIONS = new Set(["AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES", "BG", "AD", "MC", "SM", "VA", "ME", "XK"]);

/** First-run currency from the device region: euro area → EUR, US → USD, otherwise soles. */
export function regionCurrency(): Currency {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale ?? "";
    const region = tag.split(/[-_]/).slice(1).find((part) => /^[A-Za-z]{2}$/.test(part))?.toUpperCase();
    if (region && EURO_REGIONS.has(region)) return "EUR";
    if (region === "US") return "USD";
  } catch { /* Intl unavailable */ }
  return "PEN";
}

const isCurrency = (v: unknown): v is Currency => v === "PEN" || v === "USD" || v === "EUR";

function validRates(v: unknown): Rates | null {
  const r = v as Rates | null;
  if (!r || typeof r !== "object" || !r.perPen || typeof r.perPen !== "object") return null;
  const ok = (["PEN", "USD", "EUR"] as const).every((c) => typeof r.perPen[c] === "number" && Number.isFinite(r.perPen[c]) && r.perPen[c] > 0);
  return ok ? { base: "PEN", perPen: { PEN: r.perPen.PEN, USD: r.perPen.USD, EUR: r.perPen.EUR }, updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : null } : null;
}

interface Prefs {
  hydrated: boolean;
  theme: ThemeName;
  locale: Locale;
  /** Preferred display currency; listings in another currency are shown converted ("≈"). */
  currency: Currency;
  /** Last exchange rates seen, persisted so prices still convert offline. */
  rates: Rates | null;
  ageOk: boolean;
  hydrate: () => Promise<void>;
  /** Local-only setters; the session store syncs to /api/me. */
  setTheme: (t: ThemeName) => void;
  setLocale: (l: Locale) => void;
  setCurrency: (c: Currency) => void;
  /** GET /api/rates; keeps the cached value when the request fails. */
  loadRates: () => Promise<void>;
  confirmAge: () => void;
}

const persist = (s: Pick<Prefs, "theme" | "locale" | "ageOk" | "currency" | "rates">) =>
  AsyncStorage.setItem(KEY, JSON.stringify({ theme: s.theme, locale: s.locale, ageOk: s.ageOk, currency: s.currency, rates: s.rates })).catch(() => {});

export const usePrefs = create<Prefs>((set, get) => ({
  hydrated: false,
  theme: "dark",
  locale: "es-PE",
  ageOk: false,
  currency: "PEN",
  rates: null,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<Prefs>;
        const locale: Locale = p.locale === "en" ? "en" : "es-PE";
        setApiLocale(locale);
        set({
          theme: p.theme === "light" ? "light" : "dark", locale, ageOk: !!p.ageOk,
          currency: isCurrency(p.currency) ? p.currency : regionCurrency(), rates: validRates(p.rates), hydrated: true,
        });
        return;
      }
    } catch { /* fall through to defaults */ }
    // First run: follow the system colour scheme (dark stays the default when unknown).
    set({ theme: Appearance.getColorScheme() === "light" ? "light" : "dark", currency: regionCurrency(), hydrated: true });
  },
  setTheme: (theme) => { set({ theme }); persist(get()); },
  setLocale: (locale) => { setApiLocale(locale); set({ locale }); persist(get()); },
  setCurrency: (currency) => { set({ currency }); persist(get()); },
  loadRates: async () => {
    try {
      const rates = validRates(await api.rates());
      if (rates) { set({ rates }); if (get().hydrated) persist(get()); }
    } catch { /* offline: keep the cached rates */ }
  },
  confirmAge: () => { set({ ageOk: true }); persist(get()); },
}));
