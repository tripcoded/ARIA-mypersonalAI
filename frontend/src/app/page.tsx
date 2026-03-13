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
        error instanceof Error ? error.message : "Unable to connect to the backend.",
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

      // If backend says not found, still remove from UI
      if (!res.ok && !data?.detail?.toLowerCase().includes("not found")) {
        throw new Error(data.detail ?? "Unable to delete indexed source");
      }

      // Remove it from frontend state
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

      // Clear frontend state immediately
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

    if (stats.sources.some((source) => source.source_type.toLowerCase().includes("pdf"))) {
      contexts.add("Documents");
    }
    if (stats.sources.some((source) => source.source_type.toLowerCase().includes("github"))) {
      contexts.add("Code");
    }
    if (stats.sources.some((source) => source.source_type.toLowerCase().includes("youtube"))) {
      contexts.add("Media");
    }
    contexts.add("Current Goals");

    return [...contexts];
  }, [stats.sources]);

  return (
    <main className="min-h-screen px-4 pb-6 pt-4 text-slate-100 md:px-6 lg:px-8">
      <div className="mx-auto flex h-full max-w-[1680px] flex-col">
        <header className="mb-6 rounded-[24px] border border-white/8 bg-[rgba(10,10,18,0.82)] px-5 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur xl:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center text-[var(--primary-light)]">
                <Image
                  src={AriaLogo}
                  alt="Aria Logo"
                  width={44}
                  height={44}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Aria</p>
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                  Personal AI Brain
                </p>
              </div>
            </div>
            <nav className="hidden items-center gap-10 text-sm text-slate-400 md:flex">
              <span className="font-medium text-slate-200">Workspace</span>
              <span>Memories</span>
              <span>Settings</span>
            </nav>
          </div>
        </header>

        <div className="grid flex-1 gap-6 overflow-hidden xl:grid-cols-[320px_minmax(0,1fr)_320px]">
          <aside className="sticky top-4 h-fit space-y-6">
            <IngestionPanel onKnowledgeChange={refreshKnowledge} />
            <RecentsCard sources={stats.sources} />
          </aside>

          <section className="min-w-0 overflow-hidden rounded-[24px] border border-white/8 bg-[rgba(16,12,28,0.76)] shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur">
            <ChatArea onKnowledgeChange={refreshKnowledge} />
          </section>

          <aside className="sticky top-4 h-fit space-y-6">
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
      <div className="mt-5 space-y-4">
        {sources.length ? (
          sources.slice(0, 3).map((source) => (
            <div key={`${source.source}-${source.ingested_at ?? "unknown"}`}>
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
        <div className="rounded-[18px] border border-white/8 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
            System Health
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            All modules synchronized
          </div>
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
              className={`rounded-full border px-3 py-1 text-xs ${context === "Current Goals"
                  ? "border-[rgba(127,13,242,0.34)] bg-[rgba(127,13,242,0.14)] text-[var(--primary-light)]"
                  : "border-white/10 bg-white/5 text-slate-400"
                }`}
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
            type="button"
            onClick={() => onDeleteAll()}
            disabled={deletingSource !== ""}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete All
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-4 rounded-[18px] border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="soft-scroll mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {sources.length ? (
          sources.map((source) => (
            <div
              key={`${source.source}-${source.ingested_at ?? "unknown"}`}
              className="rounded-[18px] border border-white/8 bg-white/4 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">{source.source}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {source.ingested_at
                      ? new Date(source.ingested_at).toLocaleString()
                      : source.source_type}
                  </p>
                </div>
                <span className="rounded-xl bg-white/6 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  {source.source_type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onDeleteSource(source.source)}
                disabled={deletingSource === source.source}
                className="mt-3 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingSource === source.source ? "Removing..." : "Remove"}
              </button>
            </div>
          ))
        ) : (
          <p className="rounded-[18px] border border-dashed border-white/10 bg-white/4 p-4 text-sm text-slate-500">
            No indexed history available yet.
          </p>
        )}
      </div>
    </section>
  );
}
