import { Github, Mail, Linkedin, Globe } from "lucide-react";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-6 border-t border-white/10 bg-[rgba(10,10,18,0.7)] backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        {/* LEFT: Brand */}
        <div>
          <h2 className="text-base font-semibold text-white">Aria</h2>
          <p className="text-xs text-slate-500">
            Personal AI Brain · Built by <span className="text-slate-300">TripCoded</span>
          </p>
          {/* 🔥 Portfolio Link */}
          <a
            href="https://portfolio-ashy-six-19.vercel.app/"
            target="_blank"
            className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--primary-light)] hover:underline hover:scale-105 transition"
          >
            <Globe size={14} />
            About Devloper
          </a>
        </div>

        {/* RIGHT: Socials */}
        <div className="flex items-center gap-4 text-slate-400">
          
          <a
            href="mailto:omabhishektripathi@gmail.com"
            className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--primary-light)] hover:underline hover:scale-105 transition"
            title="Email"
          >
            <Mail size={18} />
          </a>

          <a
            href="https://github.com/tripcoded"
            target="_blank"
            className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--primary-light)] hover:underline hover:scale-105 transition"
            title="GitHub"
          >
            <Github size={18} />
          </a>

          <a
            href="https://linkedin.com/in/omabhishektripathi"
            target="_blank"
            className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--primary-light)] hover:underline hover:scale-105 transition"
            title="LinkedIn"
          >
            <Linkedin size={18} />
          </a>

        </div>
      </div>

      {/* Bottom line */}
      <div className="text-center text-xs text-slate-600 pb-4">
        © {year} TripCoded. All rights reserved.
      </div>
    </footer>
  );
}