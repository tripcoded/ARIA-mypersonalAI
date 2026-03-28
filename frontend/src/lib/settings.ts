import { DEFAULT_API_BASE_URL, normalizeApiBaseUrl } from "@/lib/api";

export const ARIA_SETTINGS_STORAGE_KEY = "aria-settings";
export const ARIA_CHAT_STORAGE_KEY = "aria-chat";

export type AriaSettings = {
  apiBaseUrl: string;
  voiceReplies: boolean;
  persistChatHistory: boolean;
  showResponseSources: boolean;
  reduceMotion: boolean;
};

export const defaultAriaSettings: AriaSettings = {
  apiBaseUrl: DEFAULT_API_BASE_URL,
  voiceReplies: true,
  persistChatHistory: true,
  showResponseSources: true,
  reduceMotion: false,
};

function isSettingsRecord(value: unknown): value is Partial<AriaSettings> {
  return typeof value === "object" && value !== null;
}

export function normalizeAriaSettings(value: Partial<AriaSettings> = {}): AriaSettings {
  return {
    apiBaseUrl: normalizeApiBaseUrl(value.apiBaseUrl ?? defaultAriaSettings.apiBaseUrl),
    voiceReplies: value.voiceReplies ?? defaultAriaSettings.voiceReplies,
    persistChatHistory: value.persistChatHistory ?? defaultAriaSettings.persistChatHistory,
    showResponseSources:
      value.showResponseSources ?? defaultAriaSettings.showResponseSources,
    reduceMotion: value.reduceMotion ?? defaultAriaSettings.reduceMotion,
  };
}

export function readStoredAriaSettings() {
  if (typeof window === "undefined") {
    return defaultAriaSettings;
  }

  try {
    const raw = window.localStorage.getItem(ARIA_SETTINGS_STORAGE_KEY);

    if (!raw) {
      return defaultAriaSettings;
    }

    const parsed = JSON.parse(raw) as unknown;
    return isSettingsRecord(parsed) ? normalizeAriaSettings(parsed) : defaultAriaSettings;
  } catch {
    return defaultAriaSettings;
  }
}

export function persistAriaSettings(settings: AriaSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ARIA_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function clearStoredChatHistory() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ARIA_CHAT_STORAGE_KEY);
}
