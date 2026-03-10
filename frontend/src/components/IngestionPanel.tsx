"use client";

import { type ReactNode, useState } from "react";

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
      const message = error instanceof Error ? error.message : "Unexpected error";
      setStatus(message);
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
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,24,40,0.88),rgba(12,18,31,0.84))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
      <p className="text-[11px] uppercase tracking-[0.38em] text-blue-200/65">
        Knowledge Intake
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Feed ARIA context</h2>
      <p className="mt-2 text-sm text-slate-300">
        Add documents, videos, and repositories to expand what ARIA can answer from.
      </p>

      <div className="mt-6 space-y-5">
        <Field title="Upload PDF">
          <input
            type="file"
            accept=".pdf"
            onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-400/15 file:px-3 file:py-2 file:text-blue-100"
          />
          <ActionButton
            label={loading === "pdf" ? "Uploading..." : "Upload PDF"}
            disabled={loading !== null}
            onClick={handlePdfUpload}
            accent="blue"
          />
        </Field>

        <Field title="YouTube URL">
          <input
            type="text"
            placeholder="https://youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
          />
          <ActionButton
            label={loading === "youtube" ? "Indexing..." : "Ingest Video"}
            disabled={loading !== null}
            onClick={handleYoutubeIngest}
            accent="rose"
          />
        </Field>

        <Field title="GitHub URL">
          <input
            type="text"
            placeholder="https://github.com/user/repo"
            value={githubUrl}
            onChange={(event) => setGithubUrl(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
          />
          <ActionButton
            label={loading === "github" ? "Indexing..." : "Ingest Repo"}
            disabled={loading !== null}
            onClick={handleGithubIngest}
            accent="neutral"
          />
        </Field>
      </div>

      {status ? (
        <div className="mt-5 rounded-2xl border border-blue-300/20 bg-blue-400/10 px-4 py-3 text-sm text-blue-100">
          {status}
        </div>
      ) : null}
    </section>
  );
}

function Field({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-3">
      <span className="text-sm font-medium text-slate-200">{title}</span>
      {children}
    </label>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  accent,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  accent: "blue" | "rose" | "neutral";
}) {
  const className =
    accent === "blue"
      ? "bg-blue-500 text-slate-950 hover:bg-blue-400"
      : accent === "rose"
        ? "bg-rose-500 text-white hover:bg-rose-400"
        : "bg-white/10 text-white hover:bg-white/15";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl px-4 py-3 text-sm font-medium transition ${className} disabled:cursor-not-allowed disabled:bg-slate-600`}
    >
      {label}
    </button>
  );
}
