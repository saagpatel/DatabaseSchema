import { create } from "zustand";
import type { AppSettings } from "@/types/settings";

interface SettingsState {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
  setSettings: (settings: AppSettings) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  loading: false,
  error: null,
  setSettings: (settings) => set({ settings }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
