import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "./settingsStore";
import type { AppSettings } from "@/types/settings";

const mockSettings: AppSettings = {
  theme: "dark",
  queryLimit: "500",
  ollamaEndpoint: "http://localhost:11434",
  ollamaModel: "llama3.2",
  editorFontSize: "14",
  editorTabSize: "2",
  graphLayout: "dagre",
  graphShowColumns: "true",
  graphShowTypes: "true",
};

describe("settingsStore", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settings: null,
      loading: false,
      error: null,
    });
  });

  it("sets settings", () => {
    useSettingsStore.getState().setSettings(mockSettings);
    expect(useSettingsStore.getState().settings?.theme).toBe("dark");
    expect(useSettingsStore.getState().settings?.queryLimit).toBe("500");
  });

  it("sets loading state", () => {
    useSettingsStore.getState().setLoading(true);
    expect(useSettingsStore.getState().loading).toBe(true);
  });

  it("sets error state", () => {
    useSettingsStore.getState().setError("Failed");
    expect(useSettingsStore.getState().error).toBe("Failed");
  });
});
