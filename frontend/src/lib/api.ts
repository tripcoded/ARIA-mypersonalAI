const defaultApiBaseUrl =
  process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:8000"
    : "https://om-server.teamparadox.in";

export const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? defaultApiBaseUrl;
export const API_BASE_URL = DEFAULT_API_BASE_URL;

export function normalizeApiBaseUrl(value: string) {
  const trimmed = value.trim();

  return trimmed ? trimmed.replace(/\/+$/, "") : DEFAULT_API_BASE_URL;
}

export function isLocalApiBaseUrl(value: string) {
  try {
    const url = new URL(normalizeApiBaseUrl(value));
    return ["127.0.0.1", "localhost", "0.0.0.0"].includes(url.hostname);
  } catch {
    return false;
  }
}
 
export interface KnowledgeSource {
  source: string;
  source_type: string;
  ingested_at?: string | null;
}

export interface KnowledgeStats {
  chunk_count: number;
  source_count: number;
  source_types: Record<string, number>;
  sources: KnowledgeSource[];
}
