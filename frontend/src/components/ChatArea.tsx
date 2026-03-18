"use client";

import { useEffect, useRef, useState } from "react";

import Image from "next/image";

import AriaLogo from "@/AriaLogo.png";
import { API_BASE_URL } from "@/lib/api";

type Message = {
  role: "user" | "aria";
  content: string;
  sources?: string[];
};

type Props = {
  onKnowledgeChange: () => Promise<void> | void;
  mobileAttachmentPanel?: React.ReactNode;
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
const defaultMessage: Message[] = [
  {
    role: "aria",
    content:
      "Hello! I'm Aria, your personal AI brain. I've indexed your synced knowledge sources. How can I assist you in achieving your goals today?",
  },
];

function formatBlocks(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function ChatArea({ onKnowledgeChange, mobileAttachmentPanel }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aria-chat");
      return saved ? JSON.parse(saved) : defaultMessage;
    }

    return defaultMessage;
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(true);
  const [listeningState, setListeningState] = useState("Voice standby");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [logoAnimating, setLogoAnimating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const sendMessageRef = useRef<(message: string) => Promise<void>>(async () => {});
  const voiceActiveRef = useRef(false);
  const autoSubmitRef = useRef(false);
  const recognitionRunningRef = useRef(false);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const mobileSpeechRef = useRef(false);

  useEffect(() => {
    localStorage.setItem("aria-chat", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    mobileSpeechRef.current =
      window.matchMedia("(max-width: 767px)").matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent);
  }, []);

  useEffect(() => {
    const scrollTimer = setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);

    return () => clearTimeout(scrollTimer);
  }, [messages, interimTranscript, loading]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();

      if (!voices.length) {
        return;
      }

      const preferredVoices = mobileSpeechRef.current
        ? [
            "Google US English",
            "Google UK English Male",
            "Daniel",
            "Alex",
            "Microsoft David",
            "Samantha",
            "Karen",
          ]
        : [
            "Microsoft Zira",
            "Samantha",
            "Victoria",
            "Google US English",
            "Google UK English Female",
            "Karen",
          ];

      let selectedVoice = voices.find((voice) =>
        preferredVoices.some((name) => voice.name.includes(name)),
      );

      if (!selectedVoice) {
        selectedVoice = voices.find((voice) => voice.lang.startsWith("en"));
      }

      preferredVoiceRef.current = selectedVoice || null;
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

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

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    if (preferredVoiceRef.current) {
      utterance.voice = preferredVoiceRef.current;
    }

    utterance.lang = "en-US";
    utterance.rate = mobileSpeechRef.current ? 0.9 : 0.92;
    utterance.pitch = mobileSpeechRef.current ? 0.9 : 1.02;
    utterance.volume = mobileSpeechRef.current ? 0.9 : 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const sendMessage = async (message: string) => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || loading) {
      return;
    }

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmedMessage }]);
    setLoading(true);
    setListeningState(voiceActiveRef.current ? "Aria is thinking..." : "Voice standby");

    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedMessage }),
      });
      const data = (await res.json()) as { answer?: string; detail?: string; sources?: string[] };

      if (!res.ok) {
        throw new Error(data.detail ?? "Unable to contact Aria");
      }

      const answer = data.answer ?? "I could not generate a response.";

      setMessages((prev) => [
        ...prev,
        { role: "aria", content: answer, sources: data.sources ?? [] },
      ]);

      if (voiceReplyEnabled) {
        speak(answer);
      }

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

  const clearChat = () => {
    setMessages(defaultMessage);
    localStorage.removeItem("aria-chat");
  };

  const triggerLogoWobble = () => {
    setLogoAnimating(false);
    window.setTimeout(() => setLogoAnimating(true), 0);
    window.setTimeout(() => setLogoAnimating(false), 650);
  };

  const toggleAttachments = () => {
    if (!mobileAttachmentPanel) {
      return;
    }

    setAttachmentsOpen((prev) => !prev);
  };

  return (
    <>
      <section className="rounded-[24px] border border-white/8 bg-[rgba(10,10,18,0.8)] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur md:p-6">
        <div className="mx-auto flex h-[calc(100svh-7rem)] sm:h-[calc(100svh-10rem)] xl:h-[80vh] w-full max-w-3xl flex-col sm:h-[calc(100svh-12rem)] sm:max-h-[calc(100svh-12rem)] xl:h-[80vh] xl:max-h-none">
          <div className="flex shrink-0 flex-col items-center px-2 pb-4 pt-2 text-center md:pt-4">
            <button
              type="button"
              onClick={triggerLogoWobble}
              className="relative border-none bg-transparent p-0"
            >
              <Image
                src={AriaLogo}
                alt="Aria Logo"
                width={200}
                height={200}
                className={`${logoAnimating ? "animate-wobble" : ""} h-auto w-[130px] drop-shadow-[0_0_25px_rgba(168,85,247,0.6)] sm:w-[160px] md:w-[200px]`}
              />

              <div className="absolute left-1/2 top-[82px] h-4 w-20 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(180,120,255,0.7),rgba(127,13,242,0.16),transparent_72%)] blur-md sm:top-[96px] sm:w-24 md:top-[120px]" />
            </button>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white md:mt-10 md:text-6xl">
              Aria
            </h1>
            <p className="mt-3 text-[11px] uppercase tracking-[0.32em] text-slate-400 sm:text-sm sm:tracking-[0.4em]">
              Personal AI Brain
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
              <Chip active={voiceActive}>{voiceActive ? "Voice Live" : "Voice Standby"}</Chip>
              <Chip active={voiceReplyEnabled}>
                {voiceReplyEnabled ? "Voice Replies On" : "Voice Replies Off"}
              </Chip>
              <Chip>{loading ? "Thinking" : "Ready"}</Chip>
              {isSpeaking ? <Chip active>Speaking</Chip> : null}
            </div>
          </div>

            <div className="soft-scroll flex-1 space-y-4 overflow-y-auto px-1 pb-38 pr-1 sm:space-y-6 sm:pb-20 sm:pr-2 xl:pb-61.5">                   {messages.map((msg, index) => (
              <div
                key={`${msg.role}-${index}-${msg.content.slice(0, 12)}`}
                className={`flex gap-3 sm:gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-xs font-bold ${msg.role === "user"
                      ? "border-white/10 bg-zinc-900 text-slate-300"
                      : "border-[rgba(127,13,242,0.34)] bg-[var(--primary)] text-white shadow-[0_0_18px_rgba(127,13,242,0.28)]"
                    }`}
                >
                  {msg.role === "user" ? "ME" : "A"}
                </div>

                <article
                  className={`max-w-[calc(100%-3.25rem)] flex-1 rounded-[20px] border p-4 ${msg.role === "user"
                      ? "border-[rgba(127,13,242,0.28)] bg-[rgba(127,13,242,0.14)]"
                      : "border-white/8 bg-white/4"
                    }`}
                >
                  <div className="space-y-2 text-sm leading-7 text-slate-100">
                    {formatBlocks(msg.content).map((line, lineIndex) => (
                      <p key={lineIndex}>{line}</p>
                    ))}
                  </div>
                  {msg.sources?.length ? (
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                      Sources: {msg.sources.join(", ")}
                    </p>
                  ) : null}
                </article>
              </div>
            ))}

            {loading ? (
              <div className="flex gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[rgba(127,13,242,0.34)] bg-[var(--primary)] text-white shadow-[0_0_18px_rgba(127,13,242,0.28)]">
                  A
                </div>
                <div className="rounded-[20px] border border-white/8 bg-white/4 p-4 text-sm text-slate-300">
                  Aria is generating a response...
                </div>
              </div>
            ) : null}

            {interimTranscript ? (
              <div className="rounded-[18px] border border-[rgba(127,13,242,0.34)] bg-[rgba(127,13,242,0.1)] px-4 py-3 text-sm text-slate-200">
                Heard: {interimTranscript}
              </div>
            ) : null}

            <div ref={scrollRef} />
          </div>

          <div className="mt-auto px-1 pt-4 sm:pt-3">
            <div className="rounded-[22px] border border-white/10 bg-[rgba(14,11,24,0.92)] p-2.5 sm:p-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAttachments}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-white/5 hover:text-[var(--primary-light)]"
                  title="Knowledge tools"
                >
                  <PaperclipIcon />
                </button>

                <input
                  type="text"
                  placeholder="Ask Aria anything..."
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void sendMessage(input);
                    }
                  }}
                  className="min-w-0 flex-1 bg-transparent px-1 py-3 text-[15px] text-white outline-none placeholder:text-slate-500 sm:px-2 sm:text-base"
                />

                <button
                  type="button"
                  onClick={clearChat}
                  className="hidden rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/20 sm:block"
                  title="Clear chat"
                >
                  Clear Chat
                </button>

                <button
                  type="button"
                  onClick={voiceSupported ? handlePushToTalk : undefined}
                  className="hidden h-11 w-11 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
                  title="Voice input"
                  disabled={!voiceSupported}
                >
                  <MicIcon />
                </button>

                <button
                  type="button"
                  onClick={() => void sendMessage(input)}
                  disabled={loading}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,var(--primary),var(--primary-light))] text-white shadow-[0_0_22px_rgba(127,13,242,0.34)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Send"
                >
                  <ArrowRightIcon />
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 sm:hidden">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={voiceSupported ? handlePushToTalk : undefined}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    title="Voice input"
                    disabled={!voiceSupported}
                  >
                    <MicIcon />
                  </button>

                  <button
                    type="button"
                    onClick={clearChat}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
                    title="Clear chat"
                  >
                    <TrashIcon />
                  </button>
                </div>

                <span className="truncate text-right text-[11px] text-slate-500">{listeningState}</span>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <InlineControl active={voiceActive} disabled={!voiceSupported} onClick={toggleVoiceMode}>
                {voiceActive ? "Voice Chat On" : "Voice Chat Off"}
              </InlineControl>
              <InlineControl
                active={voiceReplyEnabled}
                onClick={() => {
                  setVoiceReplyEnabled((prev) => !prev);

                  if (voiceReplyEnabled) {
                    stopSpeech();
                  }
                }}
              >
                {voiceReplyEnabled ? "Voice Reply On" : "Voice Reply Off"}
              </InlineControl>
              {isSpeaking ? (
                <button
                  type="button"
                  onClick={stopSpeech}
                  className="rounded-[8px] bg-red-600/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-red-400 transition hover:bg-red-600/40"
                >
                  Stop Speaking
                </button>
              ) : null}
              <span className="hidden text-xs text-slate-500 sm:inline">{listeningState}</span>
            </div>

            <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-slate-600">
              Aria can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </section>

      {mobileAttachmentPanel && attachmentsOpen ? (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setAttachmentsOpen(false)}
            aria-label="Close knowledge tools"
          />

          <section className="absolute inset-x-3 bottom-3 max-h-[78svh] overflow-y-auto rounded-[28px] border border-white/10 bg-[rgba(9,8,16,0.98)] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Quick Attach
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Add knowledge on mobile</h2>
              </div>

              <button
                type="button"
                onClick={() => setAttachmentsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/8"
                aria-label="Close knowledge tools"
              >
                <CloseIcon />
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-400">
              PDFs, GitHub repos, and YouTube links now live inside the attachment flow so the
              chat stays visible.
            </p>

            <div className="mt-5">{mobileAttachmentPanel}</div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function Chip({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 ${active
          ? "border-[rgba(127,13,242,0.34)] bg-[rgba(127,13,242,0.14)] text-[var(--primary-light)]"
          : "border-white/10 bg-white/5 text-slate-400"
        }`}
    >
      {children}
    </span>
  );
}

function InlineControl({
  children,
  onClick,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 text-xs transition ${active
          ? "border-[rgba(127,13,242,0.34)] bg-[rgba(127,13,242,0.14)] text-[var(--primary-light)]"
          : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/8"
        } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function PaperclipIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M15.172 7 8.586 13.586a2 2 0 1 0 2.828 2.828l6.414-6.586a4 4 0 0 0-5.656-5.656l-6.415 6.585a6 6 0 1 0 8.486 8.486L20.5 13"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M19 11a7 7 0 0 1-7 7m0 0a7 7 0 0 1-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 0 1-3-3V5a3 3 0 1 1 6 0v6a3 3 0 0 1-3 3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M4 7h16m-10 4v6m4-6v6M9 7l1-2h4l1 2m-8 0 1 12h8l1-12"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M14 5l7 7m0 0-7 7m7-7H3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
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
