"use client";

import { useEffect, useState } from "react";

import ChatArea from "@/components/ChatArea";
import IngestionPanel from "@/components/IngestionPanel";
import { API_BASE_URL, KnowledgeStats } from "@/lib/api";

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

  return (
    <main className="flex h-screen flex-col text-slate-100 selection:bg-blue-400/30">
      <div className="overflow-y-auto px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto max-w-[1540px]">
          <header className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(18,25,43,0.92),rgba(10,15,28,0.96))] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
              <div className="flex items-start gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[linear-gradient(180deg,#76acff,#4d7ef0)] text-3xl font-semibold text-slate-950 shadow-[0_12px_35px_rgba(77,126,240,0.3)]">
                  A
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.42em] text-blue-200/70">
                    Project ARIA
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    Voice-first AI knowledge workspace
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                    Search your documents, repositories, and transcripts through one chat surface.
                    The interface is rebuilt around the real workflow: ingest on the left, talk in
                    the center, inspect retrieved context on the right.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <StatCard label="Chunks Indexed" value={stats.chunk_count} accent="text-blue-300" />
                <StatCard label="Sources" value={stats.source_count} accent="text-emerald-300" />
                <StatCard
                  label="Source Types"
                  value={Object.keys(stats.source_types).length}
                  accent="text-cyan-300"
                />
              </div>
            </div>
          </header>

          <div className="mt-6 mb-6">
            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="sticky top-0 h-fit space-y-6">
                <IngestionPanel onKnowledgeChange={refreshKnowledge} />

                <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,24,40,0.88),rgba(12,18,31,0.84))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] max-h-[60vh] overflow-y-auto">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-blue-200/65">
                    Knowledge Ledger
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Indexed sources</h2>
                  {statsError ? (
                    <p className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-200">
                      {statsError}
                    </p>
                  ) : null}
                  <div className="mt-5 space-y-3">
                    {stats.sources.length ? (
                      stats.sources.map((source) => (
                        <div
                          key={`${source.source}-${source.ingested_at ?? "unknown"}`}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="rounded-full bg-blue-400/15 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-blue-200">
                              {source.source_type}
                            </span>
                            <span className="text-xs text-slate-500">
                              {source.ingested_at
                                ? new Date(source.ingested_at).toLocaleDateString()
                                : "Unknown date"}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-slate-200">{source.source}</p>
                          <button
                            type="button"
                            onClick={() => void handleDeleteSource(source.source)}
                            disabled={deletingSource === source.source}
                            className="mt-4 inline-flex rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-rose-200 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingSource === source.source ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-500">
                        No knowledge indexed yet. Start with a PDF, repo, or transcript.
                      </p>
                    )}
                  </div>
                </section>
              </aside>

              <section>
                <ChatArea onKnowledgeChange={refreshKnowledge} />
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 shadow-[0_12px_24px_rgba(0,0,0,0.16)]">
      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}
