"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import AriaLogo from "@/AriaLogo.png";
import ChatArea from "@/components/ChatArea";
import IngestionPanel from "@/components/IngestionPanel";
import { API_BASE_URL, KnowledgeSource, KnowledgeStats } from "@/lib/api";

const emptyStats: KnowledgeStats = {
  chunk_count: 0,
  source_count: 0,
  source_types: {},
  sources: [],
};

export default function Home() {
  const [stats, setStats] = useState<KnowledgeStats>(emptyStats);
  const [statsError, setStatsError] = useState("");
  const [deletingSource, setDeletingSource] = useState("");

  const refreshKnowledge = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/knowledge/stats`);
      const data = (await res.json()) as KnowledgeStats & { detail?: string };

      if (!res.ok) {
        throw new Error(data.detail ?? "Unable to load knowledge stats");
      }

      setStats(data);
      setStatsError("");
    } catch (error) {
      setStatsError(
        error instanceof Error ? error.message : "Unable to connect to the backend."
      );
    }
  };

  useEffect(() => {
    void refreshKnowledge();
  }, []);

  const handleDeleteSource = async (source: string) => {
    try {
      setDeletingSource(source);

      const res = await fetch(`${API_BASE_URL}/knowledge/source`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });

      const data = await res.json();

      if (!res.ok && !data?.detail?.toLowerCase().includes("not found")) {
        throw new Error(data.detail ?? "Unable to delete indexed source");
      }

      setStats((prev) => ({
        ...prev,
        sources: prev.sources.filter((s) => s.source !== source),
        source_count: Math.max(prev.source_count - 1, 0),
      }));
    } catch (error) {
      setStatsError(
        error instanceof Error ? error.message : "Unable to delete indexed source."
      );
    } finally {
      setDeletingSource("");
    }
  };

  const handleDeleteAllSources = async () => {
    try {
      for (const source of stats.sources) {
        await fetch(`${API_BASE_URL}/knowledge/source`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: source.source }),
        });
      }

      setStats((prev) => ({
        ...prev,
        sources: [],
        source_count: 0,
        chunk_count: 0,
      }));
    } catch (error) {
      console.error("Delete all failed", error);
    }
  };

  const activeContexts = useMemo(() => {
    const contexts = new Set<string>();

    if (stats.sources.some((s) => s.source_type.toLowerCase().includes("pdf"))) {
      contexts.add("Documents");
    }
    if (stats.sources.some((s) => s.source_type.toLowerCase().includes("github"))) {
      contexts.add("Code");
    }
    if (stats.sources.some((s) => s.source_type.toLowerCase().includes("youtube"))) {
      contexts.add("Media");
    }

    contexts.add("Current Goals");
    return [...contexts];
  }, [stats.sources]);

  return (
    <main className="min-h-screen px-4 pb-6 pt-4 text-slate-100 md:px-6 lg:px-8">
      <div className="mx-auto flex h-full w-full max-w-[1680px] flex-col px-3 sm:px-6 md:px-8">

        {/* MAIN GRID */}
       <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[320px_minmax(0,1fr)_320px] xl:gap-6 flex-1 min-h-0">

          {/* CHAT FIRST on mobile */}
          <section className="order-1 xl:order-2 min-w-0 flex flex-col rounded-[16px] sm:rounded-[24px] border overflow-hidden">
            <ChatArea onKnowledgeChange={refreshKnowledge} />
          </section>

          {/* LEFT PANEL */}
          <aside className="order-2 xl:order-1 space-y-4 xl:space-y-6">
            <IngestionPanel onKnowledgeChange={refreshKnowledge} />
            <RecentsCard sources={stats.sources} />
          </aside>

          {/* RIGHT PANEL */}
          <aside className="order-3 space-y-4 xl:space-y-6">
            <ContextCard activeContexts={activeContexts} stats={stats} />
            <HistoryCard
              deletingSource={deletingSource}
              error={statsError}
              onDeleteSource={handleDeleteSource}
              onDeleteAll={handleDeleteAllSources}
              sources={stats.sources}
            />
          </aside>

        </div>
      </div>
    </main>
  );
}

function RecentsCard({ sources }: { sources: KnowledgeSource[] }) {
  return (
    <section className="rounded-[24px] border border-white/8 bg-[rgba(16,12,28,0.76)] p-6 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Recents</p>
      <div className="flex flex-col h-full">
        {sources.length ? (
          sources.slice(0, 3).map((source) => (
            <div key={source.source}>
              <p className="truncate text-base font-medium text-slate-100">{source.source}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                {source.source_type}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No indexed sources yet.</p>
        )}
      </div>
    </section>
  );
}

function ContextCard({
  stats,
  activeContexts,
}: {
  stats: KnowledgeStats;
  activeContexts: string[];
}) {
  return (
    <section className="rounded-[24px] border border-white/8 bg-[rgba(16,12,28,0.76)] p-6 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur">
      <h2 className="text-2xl font-semibold text-white">Context Explorer</h2>

      <div className="mt-5 space-y-4">
        <div className="rounded-[18px] border border-white/8 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
            Active Memory
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Project: Aria knowledge workspace v{Math.max(stats.source_count, 1)}.0
          </p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Active Contexts
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {activeContexts.map((context) => (
            <span
              key={context}
              className="rounded-full border px-3 py-1 text-xs border-white/10 bg-white/5 text-slate-400"
            >
              {context}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function HistoryCard({
  sources,
  deletingSource,
  error,
  onDeleteSource,
  onDeleteAll,
}: {
  sources: KnowledgeSource[];
  deletingSource: string;
  error: string;
  onDeleteSource: (source: string) => void;
  onDeleteAll: () => Promise<void>;
}) {
  return (
    <section className="rounded-[24px] border border-white/8 bg-[rgba(16,12,28,0.76)] p-6 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur">
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Indexed History</h2>

        {sources.length > 0 && (
          <button
            onClick={() => onDeleteAll()}
            disabled={deletingSource !== ""}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300"
          >
            Delete All
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-rose-400">{error}</p>
      )}

      <div className="mt-5 max-h-[420px] overflow-y-auto space-y-3">
        {sources.length ? (
          sources.map((source) => (
            <div key={source.source} className="p-4 border rounded-xl">
              <p className="text-sm">{source.source}</p>
              <button
                onClick={() => onDeleteSource(source.source)}
                className="mt-2 text-xs"
              >
                Remove
              </button>
            </div>
          ))
        ) : (
          <p>No history available</p>
        )}
      </div>

    </section>
  );
}