import { useEffect, useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import type { AppSettings } from "@/types/settings";
import { showToast } from "@/components/common/Toast";

export function SettingsView() {
  const { settings, loading, loadSettings, saveSettings } = useSettings();
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  if (loading || !draft) {
    return (
      <div className="p-6 text-text-muted text-sm">Loading settings...</div>
    );
  }

  const update = (key: keyof AppSettings, value: string) => {
    setDraft({ ...draft, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(draft);
      showToast("success", "Settings saved");
    } catch (e) {
      showToast("error", String(e));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent";
  const labelClass = "block text-sm font-medium text-text-secondary mb-1";
  const sectionClass = "mb-8";
  const sectionTitle = "text-base font-semibold text-text-primary mb-4";

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Settings</h1>

      <div className={sectionClass}>
        <h2 className={sectionTitle}>Appearance</h2>
        <div>
          <label className={labelClass}>Theme</label>
          <select
            className={inputClass}
            value={draft.theme}
            onChange={(e) => update("theme", e.target.value)}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={sectionTitle}>Editor</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Font Size</label>
            <input
              type="number"
              className={inputClass}
              value={draft.editorFontSize}
              onChange={(e) => update("editorFontSize", e.target.value)}
              min="8"
              max="32"
            />
          </div>
          <div>
            <label className={labelClass}>Tab Size</label>
            <input
              type="number"
              className={inputClass}
              value={draft.editorTabSize}
              onChange={(e) => update("editorTabSize", e.target.value)}
              min="1"
              max="8"
            />
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={sectionTitle}>Database</h2>
        <div>
          <label className={labelClass}>Default Query Row Limit</label>
          <input
            type="number"
            className={inputClass}
            value={draft.queryLimit}
            onChange={(e) => update("queryLimit", e.target.value)}
            min="1"
            max="100000"
          />
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={sectionTitle}>AI (Ollama)</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Endpoint</label>
            <input
              className={inputClass}
              value={draft.ollamaEndpoint}
              onChange={(e) => update("ollamaEndpoint", e.target.value)}
              placeholder="http://localhost:11434"
            />
          </div>
          <div>
            <label className={labelClass}>Model</label>
            <input
              className={inputClass}
              value={draft.ollamaModel}
              onChange={(e) => update("ollamaModel", e.target.value)}
              placeholder="llama3.2"
            />
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={sectionTitle}>Graph</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Layout Algorithm</label>
            <select
              className={inputClass}
              value={draft.graphLayout}
              onChange={(e) => update("graphLayout", e.target.value)}
            >
              <option value="dagre">Dagre (Hierarchical)</option>
              <option value="force">Force-Directed</option>
            </select>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={draft.graphShowColumns === "true"}
                onChange={(e) =>
                  update("graphShowColumns", String(e.target.checked))
                }
                className="rounded"
              />
              Show columns
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={draft.graphShowTypes === "true"}
                onChange={(e) =>
                  update("graphShowTypes", String(e.target.checked))
                }
                className="rounded"
              />
              Show data types
            </label>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 text-sm font-medium"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
