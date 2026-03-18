"use client";

import { useState } from "react";

import { API_BASE_URL } from "@/lib/api";

type Props = {
  onKnowledgeChange: () => Promise<void> | void;
  variant?: "default" | "compact";
};

async function readResponsePayload(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await res.json()) as Record<string, unknown>;
  }

  const text = await res.text();
  return text ? ({ detail: text } as Record<string, unknown>) : {};
}

export default function IngestionPanel({
  onKnowledgeChange,
  variant = "default",
}: Props) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState<"pdf" | "youtube" | "github" | null>(null);
  const [status, setStatus] = useState("");

  const compact = variant === "compact";

  const handleRequest = async (
    kind: "pdf" | "youtube" | "github",
    request: (signal: AbortSignal) => Promise<Response>,
    successMessage: (data: Record<string, unknown>) => string,
    pendingMessage: string,
    timeoutMs = 45000,
  ) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    setLoading(kind);
    setStatus(pendingMessage);

    try {
      const res = await request(controller.signal);
      const data = await readResponsePayload(res);

      if (!res.ok) {
        throw new Error(String(data.detail ?? "Request failed"));
      }

      setStatus(successMessage(data));
      await onKnowledgeChange();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("The upload took too long. Please try again with a smaller PDF or better network.");
      } else {
        setStatus(error instanceof Error ? error.message : "Unexpected error");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(null);
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) {
      setStatus("Choose a PDF before uploading.");
      return;
    }

    const normalizedPdf =
      pdfFile.type === "application/pdf"
        ? pdfFile
        : new File([await pdfFile.arrayBuffer()], pdfFile.name || "document.pdf", {
            type: "application/pdf",
          });

    const formData = new FormData();
    formData.append("file", normalizedPdf, normalizedPdf.name);

    await handleRequest(
      "pdf",
      (signal) =>
        fetch(`${API_BASE_URL}/ingest/pdf`, {
          method: "POST",
          body: formData,
          signal,
        }),
      (data) => `Indexed PDF: ${String(data.filename ?? normalizedPdf.name)}`,
      `Uploading and indexing ${normalizedPdf.name}...`,
      120000,
    );
  };

  const handleYoutubeIngest = async () => {
    if (!youtubeUrl.trim()) {
      setStatus("Enter a YouTube URL first.");
      return;
    }

    await handleRequest(
      "youtube",
      (signal) =>
        fetch(`${API_BASE_URL}/ingest/youtube`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: youtubeUrl }),
          signal,
        }),
      () => "Indexed YouTube transcript.",
      "Indexing YouTube transcript...",
    );
  };

  const handleGithubIngest = async () => {
    if (!githubUrl.trim()) {
      setStatus("Enter a GitHub repository URL first.");
      return;
    }

    await handleRequest(
      "github",
      (signal) =>
        fetch(`${API_BASE_URL}/ingest/github`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: githubUrl }),
          signal,
        }),
      (data) => `Indexed GitHub repo: ${String(data.files_count ?? 0)} files`,
      "Syncing repository and indexing files...",
      90000,
    );
  };

  const content = (
    <>
      <div className="mt-5 space-y-4">
        <Card
          title="Upload PDF"
          actionLabel={loading === "pdf" ? "Uploading..." : "Upload PDF"}
          onAction={handlePdfUpload}
          disabled={loading !== null}
        >
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
            className="w-full rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-sm text-slate-300 outline-none file:mr-3 file:rounded-xl file:border-0 file:bg-[rgba(127,13,242,0.18)] file:px-3 file:py-2 file:text-[var(--primary-light)]"
          />
          {pdfFile ? (
            <p className="mt-3 text-xs text-slate-400">Selected: {pdfFile.name}</p>
          ) : null}
        </Card>

        <Card
          title="Paste GitHub Repo Link"
          actionLabel={loading === "github" ? "Syncing..." : "Sync Repo"}
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
    </>
  );

  if (compact) {
    return (
      <section>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Knowledge Base</p>
          </div>
          <span className="rounded-full border border-[rgba(127,13,242,0.28)] bg-[rgba(127,13,242,0.12)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--primary-light)]">
            Mobile
          </span>
        </div>
        {content}
      </section>
    );
  }

  return (
    <section className="rounded-[24px] border border-white/8 bg-[rgba(16,12,28,0.76)] p-6 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Knowledge Base</p>
      {content}
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
