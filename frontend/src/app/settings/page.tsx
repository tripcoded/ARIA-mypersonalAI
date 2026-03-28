"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import { useAriaSettings } from "@/components/SettingsProvider";
import { DEFAULT_API_BASE_URL, normalizeApiBaseUrl } from "@/lib/api";
import { clearStoredChatHistory } from "@/lib/settings";

export default function SettingsPage() {
  const { settings, resetSettings, updateSettings } = useAriaSettings();
  const [statusMessage, setStatusMessage] = useState("");

  const resetAllSettings = () => {
    resetSettings();
    setStatusMessage("Aria settings restored to their default values.");
  };

  const clearSavedConversation = () => {
    clearStoredChatHistory();
    setStatusMessage("Saved chat history cleared. The workspace will start fresh next time.");
  };

  return (
    <main className="pb-6 text-slate-100">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[28px] border border-white/8 bg-[rgba(16,12,28,0.78)] p-6 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur md:p-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Settings</p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white">Tune Aria</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400">
                These preferences are saved in your browser, so your setup stays consistent
                after reloads and future visits.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/8"
            >
              Back To Workspace
            </Link>
          </div>

          {statusMessage ? (
            <div className="mt-6 rounded-[18px] border border-[rgba(127,13,242,0.34)] bg-[rgba(127,13,242,0.12)] px-4 py-3 text-sm text-slate-100">
              {statusMessage}
            </div>
          ) : null}

          <div className="mt-8 space-y-6">
            <SettingsCard
              eyebrow="Experience"
              title="Core assistant behavior"
              description="Choose the defaults Aria should follow every time the app loads."
            >
              <ToggleRow
                checked={settings.voiceReplies}
                description="Speak Aria responses out loud when the browser supports speech synthesis."
                label="Voice replies"
                onChange={(checked) => updateSettings({ voiceReplies: checked })}
              />
              <ToggleRow
                checked={settings.persistChatHistory}
                description="Keep your conversation available after a reload using local browser storage."
                label="Remember chat history"
                onChange={(checked) => updateSettings({ persistChatHistory: checked })}
              />
              <ToggleRow
                checked={settings.showResponseSources}
                description="Show the sources line under Aria answers when supporting context is available."
                label="Show response sources"
                onChange={(checked) => updateSettings({ showResponseSources: checked })}
              />
              <ToggleRow
                checked={settings.reduceMotion}
                description="Tone down animations and smooth scrolling across the interface."
                label="Reduce motion"
                onChange={(checked) => updateSettings({ reduceMotion: checked })}
              />
            </SettingsCard>

            <SettingsCard
              eyebrow="Connection"
              title="Backend target"
              description="Point the frontend to a different ARIA API if you want to switch between local and hosted backends."
            >
              <ConnectionSettings
                key={settings.apiBaseUrl}
                onRestoreDefault={() => {
                  updateSettings({ apiBaseUrl: DEFAULT_API_BASE_URL });
                  setStatusMessage("Backend connection restored to the default Aria endpoint.");
                }}
                onSave={(url) => {
                  updateSettings({ apiBaseUrl: normalizeApiBaseUrl(url) });
                  setStatusMessage("Backend connection saved. New requests will use this URL.");
                }}
                savedApiUrl={settings.apiBaseUrl}
              />
            </SettingsCard>

            <SettingsCard
              eyebrow="Data"
              title="Stored browser data"
              description="Manage the local information ARIA saves to make reloads feel seamless."
            >
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={clearSavedConversation}
                  className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-400/20"
                >
                  Clear Saved Chat
                </button>
                <button
                  type="button"
                  onClick={resetAllSettings}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/8"
                >
                  Reset All Settings
                </button>
              </div>
            </SettingsCard>
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-4 xl:h-fit">
          <section className="rounded-[24px] border border-white/8 bg-[rgba(16,12,28,0.76)] p-6 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Saved State</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <SummaryChip active>Saved In Browser</SummaryChip>
              <SummaryChip active={settings.voiceReplies}>Voice Replies</SummaryChip>
              <SummaryChip active={settings.persistChatHistory}>Chat Memory</SummaryChip>
              <SummaryChip active={settings.showResponseSources}>Sources Visible</SummaryChip>
              <SummaryChip active={settings.reduceMotion}>Reduced Motion</SummaryChip>
            </div>
            <p className="mt-5 text-sm text-slate-400">
              The current browser stores your settings and saved conversation so the experience
              stays stable even after refresh.
            </p>
          </section>

          <section className="rounded-[24px] border border-white/8 bg-[rgba(16,12,28,0.76)] p-6 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">What Changes</p>
            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <p>Workspace, memories, uploads, and chat all use the saved backend URL.</p>
              <p>Chat voice replies and source labels update immediately from these settings.</p>
              <p>Turning off chat memory removes future persistence until you enable it again.</p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function ConnectionSettings({
  onRestoreDefault,
  onSave,
  savedApiUrl,
}: {
  onRestoreDefault: () => void;
  onSave: (url: string) => void;
  savedApiUrl: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftValue, setDraftValue] = useState(savedApiUrl);
  const connectionChanged = normalizeApiBaseUrl(draftValue) !== savedApiUrl;

  return (
    <>
      <label className="block text-sm text-slate-300" htmlFor="backend-url">
        Backend API URL
      </label>
      <input
        id="backend-url"
        ref={inputRef}
        type="text"
        defaultValue={savedApiUrl}
        onChange={(event) => setDraftValue(event.target.value)}
        placeholder={DEFAULT_API_BASE_URL}
        className="mt-3 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[rgba(127,13,242,0.34)]"
      />
      <p className="mt-3 text-sm text-slate-400">
        Current saved URL: <span className="text-slate-200">{savedApiUrl}</span>
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onSave(inputRef.current?.value ?? savedApiUrl)}
          disabled={!connectionChanged}
          className="rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-light))] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Connection
        </button>
        <button
          type="button"
          onClick={onRestoreDefault}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/8"
        >
          Use Default URL
        </button>
      </div>
    </>
  );
}

function SettingsCard({
  children,
  description,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="rounded-[24px] border border-white/8 bg-white/4 p-5 md:p-6">
      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function ToggleRow({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[18px] border border-white/8 bg-black/20 px-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition ${
          checked
            ? "border-[rgba(127,13,242,0.34)] bg-[rgba(127,13,242,0.32)]"
            : "border-white/10 bg-white/10"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function SummaryChip({
  active,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs ${
        active
          ? "border-[rgba(127,13,242,0.34)] bg-[rgba(127,13,242,0.14)] text-[var(--primary-light)]"
          : "border-white/10 bg-white/5 text-slate-400"
      }`}
    >
      {children}
    </span>
  );
}
