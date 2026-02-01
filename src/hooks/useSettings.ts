import { useCallback } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import * as settingsService from "@/services/settings";
import type { AppSettings } from "@/types/settings";

export function useSettings() {
  const store = useSettingsStore();

  const loadSettings = useCallback(async () => {
    const s = useSettingsStore.getState();
    s.setLoading(true);
    s.setError(null);
    try {
      const settings = await settingsService.getSettings();
      useSettingsStore.getState().setSettings(settings);
    } catch (e) {
      useSettingsStore.getState().setError(String(e));
    } finally {
      useSettingsStore.getState().setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(
    async (settings: AppSettings) => {
      useSettingsStore.getState().setError(null);
      try {
        const updated = await settingsService.updateSettings(settings);
        useSettingsStore.getState().setSettings(updated);
      } catch (e) {
        useSettingsStore.getState().setError(String(e));
        throw e;
      }
    },
    []
  );

  return {
    ...store,
    loadSettings,
    saveSettings,
  };
}
