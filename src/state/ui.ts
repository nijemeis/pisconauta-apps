import { create } from "zustand";

interface Ui {
  toast: { id: number; message: string } | null;
  showToast: (message: string) => void;
  hideToast: () => void;
  /** One-shot handoff into the Search tab (from Discover chips or the scanner's NO ES ESTE). */
  pendingSearch: { q?: string; region?: string } | null;
  setPendingSearch: (p: Ui["pendingSearch"]) => void;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
}

let n = 0;
export const useUi = create<Ui>((set) => ({
  toast: null,
  showToast: (message) => set({ toast: { id: ++n, message } }),
  hideToast: () => set({ toast: null }),
  pendingSearch: null,
  setPendingSearch: (pendingSearch) => set({ pendingSearch }),
  profileOpen: false,
  setProfileOpen: (profileOpen) => set({ profileOpen }),
}));

export const toast = (message: string) => useUi.getState().showToast(message);
export const toastError = (e: unknown) => toast(e instanceof Error && e.message ? e.message : "Algo salió mal. Inténtalo de nuevo.");
