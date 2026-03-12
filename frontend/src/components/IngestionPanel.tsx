"use client";

import { useState } from "react";

import { API_BASE_URL } from "@/lib/api";

type Props = {
  onKnowledgeChange: () => Promise<void> | void;
};

export default function IngestionPanel({ onKnowledgeChange }: Props) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState<"pdf" | "youtube" | "github" | null>(null);
  const [status, setStatus] = useState("");

  const handleRequest = async (
    kind: "pdf" | "youtube" | "github",
    request: () => Promise<Response>,
    successMessage: (data: Record<string, unknown>) => string,
  ) => {
    setLoading(kind);
    setStatus("");

    try {
      const res = await request();
      const data = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        throw new Error(String(data.detail ?? "Request failed"));
      }

      setStatus(successMessage(data));
      await onKnowledgeChange();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) {
      setStatus("Choose a PDF before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", pdfFile);

    await handleRequest(
      "pdf",
      () =>
        fetch(`${API_BASE_URL}/ingest/pdf`, {
          method: "POST",
          body: formData,
        }),
      (data) => `Indexed PDF: ${String(data.filename ?? pdfFile.name)}`,
    );
  };

  const handleYoutubeIngest = async () => {
    if (!youtubeUrl.trim()) {
      setStatus("Enter a YouTube URL first.");
      return;
    }

    await handleRequest(
      "youtube",
      () =>
        fetch(`${API_BASE_URL}/ingest/youtube`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: youtubeUrl }),
        }),
      () => "Indexed YouTube transcript.",
    );
  };

  const handleGithubIngest = async () => {
    if (!githubUrl.trim()) {
      setStatus("Enter a GitHub repository URL first.");
      return;
    }

    await handleRequest(
      "github",
      () =>
        fetch(`${API_BASE_URL}/ingest/github`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: githubUrl }),
        }),
      (data) => `Indexed GitHub repo: ${String(data.files_count ?? 0)} files`,
    );
  };

  return (
    <section className="rounded-[24px] border border-white/8 bg-[rgba(16,12,28,0.76)] p-6 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Knowledge Base</p>
      <div className="mt-5 space-y-4">
        <Card
          title="Upload PDF"
          actionLabel={loading === "pdf" ? "Uploading..." : "Upload PDF"}
          onAction={handlePdfUpload}
          disabled={loading !== null}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
            className="w-full rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-sm text-slate-300 outline-none file:mr-3 file:rounded-xl file:border-0 file:bg-[rgba(127,13,242,0.18)] file:px-3 file:py-2 file:text-[var(--primary-light)]"
          />
        </Card>

        <Card
          title="Paste GitHub Repo Link"
          actionLabel={loading === "github" ? "Sync Repo" : "Sync Repo"}
          onAction={handleGithubIngest}
          disabled={loading !== null}
        >
          <input
            type="text"
            placeholder="https://github.com/user/repo"
            value={githubUrl}
            onChange={(event) => setGithubUrl(event.target.value)}
            className="w-full rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[rgba(127,13,242,0.34)]"
          />
        </Card>

        <Card
          title="YouTube Videos"
          actionLabel={loading === "youtube" ? "Indexing..." : "Index Video"}
          onAction={handleYoutubeIngest}
          disabled={loading !== null}
        >
          <input
            type="text"
            placeholder="https://youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            className="w-full rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[rgba(127,13,242,0.34)]"
          />
        </Card>
      </div>

      {status ? (
        <div className="mt-5 rounded-[18px] border border-[rgba(127,13,242,0.34)] bg-[rgba(127,13,242,0.12)] p-3 text-sm text-slate-200">
          {status}
        </div>
      ) : null}
    </section>
  );
}

function Card({
  title,
  actionLabel,
  onAction,
  disabled,
  children,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-white/4 p-4">
      <p className="text-lg font-semibold text-white">{title}</p>
      <div className="mt-4">{children}</div>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className="mt-4 w-full rounded-2xl bg-[linear-gradient(135deg,var(--primary),var(--primary-light))] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {actionLabel}
      </button>
    </div>
  );
}
