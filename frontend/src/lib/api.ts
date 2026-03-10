export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
