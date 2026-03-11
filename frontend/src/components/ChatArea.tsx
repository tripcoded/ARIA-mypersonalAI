"use client";

import { useEffect, useRef, useState } from "react";

import { API_BASE_URL } from "@/lib/api";

type Message = {
  role: "user" | "aria";
  content: string;
  sources?: string[];
};

type SearchResult = {
  content: string;
  source: string;
  score: number;
};

type Props = {
  onKnowledgeChange: () => Promise<void> | void;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}

const WAKE_PHRASE = "hey aria";
const FEMALE_VOICE_HINTS = [
  "female",
  "woman",
  "zira",
  "susan",
  "aria",
  "samantha",
  "victoria",
  "karen",
  "moira",
  "tessa",
  "veena",
  "fiona",
  "ava",
  "allison",
  "joanna",
  "kendra",
  "serena",
  "sonia",
];

function formatBlocks(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function ChatArea({ onKnowledgeChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "aria",
      content:
        "ARIA is ready. Ask about anything from your indexed files, repositories, and transcripts.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(true);
  const [preferredVoice, setPreferredVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [listeningState, setListeningState] = useState("Voice standby");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const sendMessageRef = useRef<(message: string) => Promise<void>>(async () => {});
  const voiceActiveRef = useRef(false);
  const autoSubmitRef = useRef(false);
  const recognitionRunningRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const pickPreferredVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) {
        return;
      }

      const femaleVoice =
        voices.find((voice) =>
          FEMALE_VOICE_HINTS.some((hint) => voice.name.toLowerCase().includes(hint)),
        ) ??
        voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
        voices[0];

      setPreferredVoice(femaleVoice);
    };

    pickPreferredVoice();
    window.speechSynthesis.onvoiceschanged = pickPreferredVoice;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimTranscript, loading]);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;

    if (!SpeechRecognition) {
      setListeningState("Speech recognition unavailable");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1];
      const transcript = latest[0]?.transcript?.trim() ?? "";
      setInterimTranscript(transcript);

      if (!latest.isFinal || !transcript) {
        return;
      }

      const normalized = transcript.toLowerCase();
      const wakePhraseDetected = normalized.startsWith(WAKE_PHRASE);
      const manualTrigger = autoSubmitRef.current;

      if (!wakePhraseDetected && !manualTrigger) {
        setListeningState(`Listening for "${WAKE_PHRASE}"`);
        return;
      }

      autoSubmitRef.current = false;
      const command = wakePhraseDetected
        ? transcript.slice(WAKE_PHRASE.length).trim()
        : transcript;

      if (!command) {
        setListeningState("Wake phrase heard. Waiting for your question.");
        return;
      }

      setInterimTranscript("");
      void sendMessageRef.current(command);
    };

    recognition.onend = () => {
      recognitionRunningRef.current = false;
      if (voiceActiveRef.current) {
        try {
          recognition.start();
          recognitionRunningRef.current = true;
        } catch {
          setListeningState("Voice recognition is restarting...");
        }
      } else {
        setListeningState("Voice standby");
      }
    };

    recognition.onerror = (event) => {
      recognitionRunningRef.current = false;
      setListeningState(`Voice error: ${event.error}`);
    };

    recognitionRef.current = recognition;
    setVoiceSupported(true);

    return () => {
      voiceActiveRef.current = false;
      recognitionRunningRef.current = false;
      recognition.stop();
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = (text: string) => {
    if (!voiceReplyEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.rate = 1;
    utterance.pitch = 1.08;
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoiceReplies = () => {
    setVoiceReplyEnabled((prev) => {
      const next = !prev;
      if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  };

  const sendMessage = async (message: string) => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || loading) {
      return;
    }

    setInput("");
    setSemanticResults([]);
    setMessages((prev) => [...prev, { role: "user", content: trimmedMessage }]);
    setLoading(true);
    setListeningState(voiceActiveRef.current ? "ARIA is thinking..." : listeningState);

    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedMessage }),
      });
      const data = (await res.json()) as { answer?: string; sources?: string[]; detail?: string };

      if (!res.ok) {
        throw new Error(data.detail ?? "Unable to contact ARIA");
      }

      const answer = data.answer ?? "I could not generate a response.";
      setMessages((prev) => [
        ...prev,
        { role: "aria", content: answer, sources: data.sources ?? [] },
      ]);
      speak(answer);
      await onKnowledgeChange();
      setListeningState(
        voiceActiveRef.current ? `Listening for "${WAKE_PHRASE}"` : "Voice standby",
      );
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Sorry, I encountered an error.";
      setMessages((prev) => [...prev, { role: "aria", content: messageText }]);
      setListeningState(messageText);
    } finally {
      setLoading(false);
    }
  };

  sendMessageRef.current = sendMessage;

  const toggleVoiceMode = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      return;
    }

    if (voiceActiveRef.current) {
      voiceActiveRef.current = false;
      setVoiceActive(false);
      recognitionRunningRef.current = false;
      recognition.stop();
      return;
    }

    voiceActiveRef.current = true;
    setVoiceActive(true);
    setListeningState(`Listening for "${WAKE_PHRASE}"`);
    if (!recognitionRunningRef.current) {
      try {
        recognition.start();
        recognitionRunningRef.current = true;
      } catch {
        setListeningState("Voice recognition is already active.");
      }
    }
  };

  const handlePushToTalk = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      return;
    }

    autoSubmitRef.current = true;
    setListeningState("Listening for your direct command...");

    if (!voiceActiveRef.current) {
      if (!recognitionRunningRef.current) {
        try {
          recognition.start();
          recognitionRunningRef.current = true;
        } catch {
          setListeningState("Voice recognition is already active.");
          return;
        }
      }
      window.setTimeout(() => {
        recognitionRunningRef.current = false;
        recognition.stop();
      }, 4500);
    }
  };

  return (
    <div className="grid h-full gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex min-h-[720px] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,25,43,0.94),rgba(10,14,24,0.98))] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-blue-200/65">
                Conversation
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-white">
                Chat with ARIA
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Ask questions, inspect retrieved context, and use voice controls directly from the composer below.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              {listeningState}
            </div>
          </div>
          {interimTranscript ? (
            <div className="mt-4 rounded-2xl border border-blue-300/20 bg-blue-400/10 px-4 py-3 text-sm text-blue-100">
              Heard: {interimTranscript}
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            {messages.map((msg, index) => (
              <div
                key={`${msg.role}-${index}-${msg.content.slice(0, 12)}`}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <article
                  className={`max-w-[86%] rounded-[26px] px-5 py-4 text-sm leading-7 ${
                    msg.role === "user"
                      ? "bg-[linear-gradient(180deg,#6ea8ff,#4f7df2)] text-slate-950 shadow-[0_12px_30px_rgba(79,125,242,0.25)]"
                      : "border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.04))] text-slate-100 shadow-[0_12px_24px_rgba(0,0,0,0.16)]"
                  }`}
                >
                  <div className="space-y-3">
                    {formatBlocks(msg.content).map((line, lineIndex) => (
                      <p key={lineIndex}>{line}</p>
                    ))}
                  </div>
                  {msg.sources?.length ? (
                    <div className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-400">
                      Sources: {msg.sources.join(", ")}
                    </div>
                  ) : null}
                </article>
              </div>
            ))}
            {loading ? (
              <div className="flex justify-start">
                <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  ARIA is generating a response...
                </div>
              </div>
            ) : null}
            <div ref={scrollRef} />
          </div>
        </div>

        <div className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(12,18,31,0.96),rgba(7,11,20,0.98))] px-6 py-5">
          <div className="rounded-[28px] border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <ControlButton
                active={voiceActive}
                disabled={!voiceSupported}
                label={voiceActive ? "Voice Chat On" : "Voice Chat Off"}
                onClick={toggleVoiceMode}
                activeClassName="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              />
              <ControlButton
                label="Push to Talk"
                disabled={!voiceSupported}
                onClick={handlePushToTalk}
              />
              <ControlButton
                active={voiceReplyEnabled}
                label={voiceReplyEnabled ? "Voice Reply On" : "Voice Reply Off"}
                onClick={toggleVoiceReplies}
                activeClassName="bg-blue-500 text-slate-950 hover:bg-blue-400"
              />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                placeholder="Ask about your PDFs, repo code, or transcripts..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void sendMessage(input);
                  }
                }}
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
              />
              <button
                onClick={() => void sendMessage(input)}
                disabled={loading}
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-blue-500 px-7 text-sm font-semibold text-slate-950 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-600"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,24,40,0.82),rgba(12,18,31,0.8))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.35em] text-blue-200/65">
            Retrieved Context
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">Closest matches</h3>
          <div className="mt-4 space-y-3">
            {semanticResults.length ? (
              semanticResults.map((result, index) => (
                <div
                  key={`${result.source}-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Match {index + 1}
                  </div>
                  <div className="mt-2 text-sm font-medium text-white">{result.source}</div>
                  <p className="mt-2 line-clamp-4 text-sm text-slate-400">{result.content}</p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-500">
                Ask a question to see the most relevant chunks here.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,24,40,0.82),rgba(12,18,31,0.8))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.35em] text-blue-200/65">
            Quick Guide
          </p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>The send button is fixed in the composer at the bottom of the chat panel.</li>
            <li>Voice chat, push-to-talk, and voice reply controls sit directly above the input.</li>
            <li>Say &quot;Hey ARIA&quot; in voice chat mode, or use push-to-talk for one-shot commands.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  active,
  activeClassName,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  activeClassName?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        active
          ? activeClassName ?? "bg-blue-500 text-slate-950 hover:bg-blue-400"
          : "border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
      } disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-slate-500`}
    >
      {label}
    </button>
  );
}
