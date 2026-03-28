"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import ChatArea from "@/components/ChatArea";
import IngestionPanel from "@/components/IngestionPanel";
import { useAriaSettings } from "@/components/SettingsProvider";
import { KnowledgeSource, KnowledgeStats } from "@/lib/api";

const emptyStats: KnowledgeStats = {
  chunk_count: 0,
  source_count: 0,
  source_types: {},
  sources: [],
};

const mobileNavItems = [
  { href: "/", label: "Workspace" },
  { href: "/memories", label: "Memories" },
  { href: "/settings", label: "Settings" },
];

export default function Home() {
  const {
    settings: { apiBaseUrl },
  } = useAriaSettings();
  const [stats, setStats] = useState<KnowledgeStats>(emptyStats);
  const [statsError, setStatsError] = useState("");
  const [deletingSource, setDeletingSource] = useState("");
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);

  const refreshKnowledge = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/knowledge/stats`);
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
  }, [apiBaseUrl]);

  useEffect(() => {
    void refreshKnowledge();
  }, [refreshKnowledge]);

  useEffect(() => {
    document.body.style.overflow = mobileWorkspaceOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileWorkspaceOpen]);

  const handleDeleteSource = async (source: string) => {
    try {
      setDeletingSource(source);

      const res = await fetch(`${apiBaseUrl}/knowledge/source`, {
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
        sources: prev.sources.filter((entry) => entry.source !== source),
        source_count: Math.max(prev.source_count - 1, 0),
      }));
    } catch (error) {
      setStatsError(
        error instanceof Error ? error.message : "Unable to delete indexed source.",
      );
    } finally {
      setDeletingSource("");
    }
  };

  const handleDeleteAllSources = async () => {
    try {
      for (const source of stats.sources) {
        await fetch(`${apiBaseUrl}/knowledge/source`, {
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
    <main className="min-h-0 pb-6 text-slate-100">
      <div className="flex h-full flex-col">
        <section className="mb-4 rounded-[22px] border border-white/8 bg-[rgba(16,12,28,0.76)] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur xl:hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                Mobile Workspace
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">Keep chat in focus</h2>
              <p className="mt-1 text-sm text-slate-400">
                Open the top-right menu for nav, context, recents, and indexed history.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMobileWorkspaceOpen(true)}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/8"
            >
              Open Panels
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <SummaryChip>{stats.source_count} indexed sources</SummaryChip>
            <SummaryChip>{stats.chunk_count} chunks</SummaryChip>
            {activeContexts.map((context) => (
              <SummaryChip key={context}>{context}</SummaryChip>
            ))}
          </div>
        </section>

        <div className="grid flex-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
          <aside className="hidden space-y-6 xl:sticky xl:top-4 xl:block xl:h-fit">
            <IngestionPanel onKnowledgeChange={refreshKnowledge} />
            <RecentsCard sources={stats.sources} />
          </aside>

          <section className="min-w-0 overflow-hidden rounded-[24px] border border-white/8 bg-[rgba(16,12,28,0.76)] shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur">
            <ChatArea
              onKnowledgeChange={refreshKnowledge}
              mobileAttachmentPanel={
                <IngestionPanel onKnowledgeChange={refreshKnowledge} variant="compact" />
              }
            />
          </section>

          <aside className="hidden space-y-6 xl:sticky xl:top-4 xl:block xl:h-fit">
            <ContextCard activeContexts={activeContexts} stats={stats} />
            <HistoryCard
              deletingSource={deletingSource}
              error={statsError}
              onDeleteAll={handleDeleteAllSources}
              onDeleteSource={handleDeleteSource}
              sources={stats.sources}
            />
          </aside>
        </div>

        {mobileWorkspaceOpen ? (
          <MobileWorkspaceDrawer
            activeContexts={activeContexts}
            deletingSource={deletingSource}
            error={statsError}
            onClose={() => setMobileWorkspaceOpen(false)}
            onDeleteAll={handleDeleteAllSources}
            onDeleteSource={handleDeleteSource}
            stats={stats}
          />
        ) : null}
      </div>
    </main>
  );
}

function MobileWorkspaceDrawer({
  activeContexts,
  deletingSource,
  error,
  onClose,
  onDeleteAll,
  onDeleteSource,
  stats,
}: {
  activeContexts: string[];
  deletingSource: string;
  error: string;
  onClose: () => void;
  onDeleteAll: () => Promise<void>;
  onDeleteSource: (source: string) => void;
  stats: KnowledgeStats;
}) {
  return (
    <div className="fixed inset-0 z-40 xl:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close mobile workspace drawer"
      />

      <aside className="absolute right-0 top-0 h-full w-[min(92vw,380px)] overflow-y-auto border-l border-white/10 bg-[rgba(8,8,14,0.98)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Workspace Drawer
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Navigation Panel</h2>
            <p className="mt-2 text-sm text-slate-400">
              Navigation and indexed knowledge 
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/8"
            aria-label="Close mobile workspace drawer"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {mobileNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center justify-between rounded-[18px] border border-white/8 bg-white/4 px-4 py-4 text-base text-slate-100 transition hover:bg-white/8"
            >
              {item.label}
              <ArrowIcon />
            </Link>
          ))}
        </div>

        <div className="mt-6 space-y-4 pb-4">
          <RecentsCard sources={stats.sources} />
          <ContextCard activeContexts={activeContexts} stats={stats} />
          <HistoryCard
            deletingSource={deletingSource}
            error={error}
            onDeleteAll={onDeleteAll}
            onDeleteSource={onDeleteSource}
            sources={stats.sources}
          />
        </div>
      </aside>
    </div>
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
  activeContexts,
  stats,
}: {
  activeContexts: string[];
  stats: KnowledgeStats;
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
  deletingSource,
  error,
  onDeleteAll,
  onDeleteSource,
  sources,
}: {
  deletingSource: string;
  error: string;
  onDeleteAll: () => Promise<void>;
  onDeleteSource: (source: string) => void;
  sources: KnowledgeSource[];
}) {
  return (
    <section className="rounded-[24px] border border-white/8 bg-[rgba(16,12,28,0.76)] p-6 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-white">Indexed History</h2>
        {sources.length ? (
          <button
            type="button"
            onClick={() => onDeleteAll()}
            disabled={deletingSource !== ""}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete All
          </button>
        ) : null}
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

function SummaryChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
      {children}
    </span>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="m6 6 12 12M18 6 6 18"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M5 12h14m0 0-6-6m6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
