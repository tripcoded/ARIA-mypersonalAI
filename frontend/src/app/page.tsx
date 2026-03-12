"use client";

import { useEffect, useMemo, useState } from "react";

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
      const data = (await res.json()) as { detail?: string };

      if (!res.ok) {
        throw new Error(data.detail ?? "Unable to delete indexed source");
      }

      await refreshKnowledge();
    } catch (error) {
      setStatsError(
        error instanceof Error ? error.message : "Unable to delete indexed source.",
      );
    } finally {
      setDeletingSource("");
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

    return [...contexts].slice(0, 4);
  }, [stats.sources]);

  return (
    <main className="aria-shell min-h-screen px-4 pb-6 pt-4 text-slate-100 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1680px]">
        <header className="glass-panel holo-border sticky top-4 z-20 mb-6 overflow-hidden rounded-[28px] px-5 py-4 md:px-8">
          <div className="bg-shape left-[-8%] top-[-35%] h-48 w-48 rounded-full bg-[var(--primary)]" />
          <div className="bg-shape right-[10%] top-[-25%] h-36 w-36 rounded-full bg-[var(--primary-dark)]" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--line-strong)] bg-[linear-gradient(135deg,rgba(127,13,242,0.35),rgba(56,18,112,0.16))] shadow-[0_0_24px_rgba(127,13,242,0.35)]">
                <span className="text-lg font-bold tracking-[0.18em] text-[var(--primary-light)]">
                  A
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Aria</p>
                <p className="text-[10px] uppercase tracking-[0.34em] text-slate-500">
                  Personal AI Brain
                </p>
              </div>
            </div>

            <nav className="hidden items-center gap-10 text-sm text-slate-400 md:flex">
              <span className="font-medium text-slate-200">Workspace</span>
              <span className="transition hover:text-white">Memories</span>
              <span className="transition hover:text-white">Settings</span>
            </nav>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
          <aside className="space-y-6">
            <IngestionPanel onKnowledgeChange={refreshKnowledge} />
            <RecentSourcesCard sources={stats.sources} />
          </aside>

          <section className="min-w-0">
            <ChatArea onKnowledgeChange={refreshKnowledge} />
          </section>

          <aside className="space-y-6">
            <ContextExplorerCard stats={stats} activeContexts={activeContexts} />
            <IndexedHistoryCard
              deletingSource={deletingSource}
              error={statsError}
              onDeleteSource={handleDeleteSource}
              sources={stats.sources}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function RecentSourcesCard({ sources }: { sources: KnowledgeSource[] }) {
  return (
    <section className="glass-panel-soft rounded-[28px] p-6">
      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Recents</p>
      <div className="mt-5 space-y-4">
        {sources.length ? (
          sources.slice(0, 3).map((source) => (
            <div key={`${source.source}-${source.ingested_at ?? "unknown"}`} className="text-slate-300">
              <p className="truncate text-base font-medium text-slate-100">{source.source}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
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

function ContextExplorerCard({
  stats,
  activeContexts,
}: {
  stats: KnowledgeStats;
  activeContexts: string[];
}) {
  return (
    <section className="glass-panel-soft rounded-[28px] p-6">
      <h2 className="text-2xl font-semibold text-white">Context Explorer</h2>
      <div className="mt-5 space-y-4">
        <div className="rounded-[20px] border border-white/8 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary-light)]">
            Active Memory
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Project: Aria knowledge workspace v{Math.max(stats.source_count, 1)}.0
          </p>
        </div>
        <div className="rounded-[20px] border border-white/8 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary-light)]">
            System Health
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            All modules synchronized
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Active Contexts
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {activeContexts.map((context) => (
            <span
              key={context}
              className={`rounded-full border px-3 py-1 text-xs ${
                context === "Current Goals"
                  ? "border-[var(--line-strong)] bg-[rgba(127,13,242,0.14)] text-[var(--primary-light)]"
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

function IndexedHistoryCard({
  sources,
  deletingSource,
  onDeleteSource,
  error,
}: {
  sources: KnowledgeSource[];
  deletingSource: string;
  onDeleteSource: (source: string) => void;
  error: string;
}) {
  return (
    <section className="glass-panel-soft rounded-[28px] p-6">
      <h2 className="text-2xl font-semibold text-white">Indexed History</h2>
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
              className="rounded-[20px] border border-white/8 bg-white/4 p-4"
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
                <span className="rounded-xl bg-white/6 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
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
          <p className="rounded-[20px] border border-dashed border-white/10 bg-white/4 p-4 text-sm text-slate-500">
            No indexed history available yet.
          </p>
        )}
      </div>
    </section>
  );
}
