import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { ApiError, api, setAuthToken } from "@/api/client";
import type { AuthResult, CellarState, Currency, Me } from "@/api/types";
import type { ThemeName } from "@/theme/tokens";
import { usePrefs, type Locale } from "./prefs";
import { toastError } from "./ui";

const TOKEN_KEY = "pisconauta.token";

interface Session {
  ready: boolean;
  user: Me["user"];
  producers: Me["producers"];
  tasted: Record<string, true>;
  wishlist: Record<string, true>;
  /** Bumped whenever the cellar changes so Mi Cava knows to refetch. */
  cellarVersion: number;
  bootstrap: () => Promise<void>;
  signIn: (r: AuthResult) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setTheme: (t: ThemeName) => void;
  setLocale: (l: Locale) => void;
  setCurrency: (c: Currency) => void;
  /** Optimistic ♡ toggle, reverted if the request fails. */
  toggleWishlist: (piscoId: string) => Promise<void>;
  markTasted: (piscoId: string) => void;
  removeFromCellar: (piscoId: string) => Promise<void>;
}

const toSet = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, true as const]));

function applyMe(me: Me) {
  return { user: me.user, producers: me.producers, tasted: toSet(me.cellar.tasted), wishlist: toSet(me.cellar.wishlist) };
}

function adoptAccountPrefs(me: Me) {
  if (!me.user) return;
  const prefs = usePrefs.getState();
  if (me.user.theme === "dark" || me.user.theme === "light") prefs.setTheme(me.user.theme);
  if (me.user.locale === "en" || me.user.locale === "es-PE") prefs.setLocale(me.user.locale);
  if (me.user.currency === "PEN" || me.user.currency === "USD" || me.user.currency === "EUR") prefs.setCurrency(me.user.currency);
}

export const useSession = create<Session>((set, get) => ({
  ready: false,
  user: null,
  producers: [],
  tasted: {},
  wishlist: {},
  cellarVersion: 0,

  bootstrap: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
      if (token) {
        setAuthToken(token);
        try {
          const me = await api.me();
          if (me.user) { set(applyMe(me)); adoptAccountPrefs(me); }
          else { setAuthToken(null); await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}); }
        } catch (e) {
          // Offline: keep the token for next launch; an explicit 401 drops it.
          if (e instanceof ApiError && e.status === 401) { setAuthToken(null); await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}); }
        }
      }
    } finally {
      set({ ready: true });
    }
  },

  signIn: async (r) => {
    setAuthToken(r.token);
    await SecureStore.setItemAsync(TOKEN_KEY, r.token).catch(() => {});
    set({ ...applyMe(r), cellarVersion: get().cellarVersion + 1 });
    adoptAccountPrefs(r);
  },

  signOut: async () => {
    await api.logout().catch(() => {});
    setAuthToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    set({ user: null, producers: [], tasted: {}, wishlist: {}, cellarVersion: get().cellarVersion + 1 });
  },

  refresh: async () => {
    if (!get().user) return;
    try { set(applyMe(await api.me())); } catch { /* keep what we have */ }
  },

  setTheme: (t) => {
    usePrefs.getState().setTheme(t);
    if (get().user) api.patchMe({ theme: t }).catch(() => {});
  },
  setLocale: (l) => {
    usePrefs.getState().setLocale(l);
    if (get().user) api.patchMe({ locale: l }).catch(() => {});
  },

  setCurrency: (c) => {
    usePrefs.getState().setCurrency(c);
    if (get().user) api.patchMe({ currency: c }).catch(() => {});
  },

  toggleWishlist: async (piscoId) => {
    const before = { tasted: get().tasted, wishlist: get().wishlist };
    const wished = !!before.wishlist[piscoId];
    const wasTasted = !!before.tasted[piscoId];
    const wishlist = { ...before.wishlist };
    if (wished) delete wishlist[piscoId]; else wishlist[piscoId] = true;
    set({ wishlist });
    try {
      if (wished) await api.deleteCellar(piscoId);
      else if (!wasTasted) await api.putCellar(piscoId, { state: "wishlist" });
      else { set(before); return; } // already tasted: a cellar entry has one state, keep CATADOS
      set({ cellarVersion: get().cellarVersion + 1 });
    } catch (e) {
      set(before);
      toastError(e);
    }
  },

  markTasted: (piscoId) => {
    const wishlist = { ...get().wishlist };
    delete wishlist[piscoId];
    set({ tasted: { ...get().tasted, [piscoId]: true }, wishlist, cellarVersion: get().cellarVersion + 1 });
  },

  removeFromCellar: async (piscoId) => {
    const before = { tasted: get().tasted, wishlist: get().wishlist };
    const tasted = { ...before.tasted }; const wishlist = { ...before.wishlist };
    delete tasted[piscoId]; delete wishlist[piscoId];
    set({ tasted, wishlist });
    try { await api.deleteCellar(piscoId); set({ cellarVersion: get().cellarVersion + 1 }); }
    catch (e) { set(before); toastError(e); }
  },
}));

export type { CellarState };
