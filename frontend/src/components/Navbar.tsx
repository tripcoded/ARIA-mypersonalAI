"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import AriaLogo from "@/AriaLogo.png";

const navItems = [
  { href: "/", label: "Workspace" },
  { href: "/memories", label: "Memories" },
  { href: "/settings", label: "Settings" },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="relative z-30 mb-6 rounded-[24px] border border-white/8 bg-[rgba(10,10,18,0.82)] px-4 py-4 shadow-lg sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center text-[var(--primary-light)]">
              <Image src={AriaLogo} alt="Aria Logo" width={44} height={44} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Aria</p>
              <p className="truncate text-[10px] uppercase tracking-[0.28em] text-slate-500">
                Personal AI Brain
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/8 md:hidden"
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </button>
        </div>
      </header>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          />

          <aside className="absolute right-0 top-0 flex h-full w-[min(88vw,360px)] flex-col border-l border-white/10 bg-[rgba(8,8,14,0.98)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Navigation</p>
                <p className="mt-2 text-xl font-semibold text-white">Aria Workspace</p>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/8"
                aria-label="Close navigation menu"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-[18px] border border-white/8 bg-white/4 px-4 py-4 text-base text-slate-100 transition hover:bg-white/8"
                >
                  {item.label}
                  <ArrowIcon />
                </Link>
              ))}
            </div>

            <div className="mt-6 rounded-[18px] border border-white/8 bg-white/4 p-4 text-sm text-slate-400">
              Use the workspace drawer below the navbar to access context and indexed history on
              mobile.
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function MenuIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M4 7h16M4 12h16M4 17h16"
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
