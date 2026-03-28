"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  type AriaSettings,
  defaultAriaSettings,
  normalizeAriaSettings,
  persistAriaSettings,
  readStoredAriaSettings,
  ARIA_SETTINGS_STORAGE_KEY,
} from "@/lib/settings";

type SettingsContextValue = {
  settings: AriaSettings;
  resetSettings: () => void;
  updateSettings: (updates: Partial<AriaSettings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export default function SettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<AriaSettings>(() => readStoredAriaSettings());

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ARIA_SETTINGS_STORAGE_KEY) {
        setSettings(readStoredAriaSettings());
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.motion = settings.reduceMotion ? "reduced" : "full";

    return () => {
      delete document.documentElement.dataset.motion;
    };
  }, [settings.reduceMotion]);

  const value: SettingsContextValue = {
    settings,
    resetSettings: () => {
      persistAriaSettings(defaultAriaSettings);
      setSettings(defaultAriaSettings);
    },
    updateSettings: (updates) => {
      const nextSettings = normalizeAriaSettings({ ...settings, ...updates });
      persistAriaSettings(nextSettings);
      setSettings(nextSettings);
    },
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAriaSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useAriaSettings must be used within a SettingsProvider.");
  }

  return context;
}
