import Link from "next/link";

const footerLinks = [
  { href: "/", label: "Workspace" },
  { href: "/memories", label: "Memories" },
  { href: "/settings", label: "Settings" },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-8 rounded-[24px] border border-white/8 bg-[rgba(10,10,18,0.82)] px-5 py-5 shadow-[0_18px_42px_rgba(0,0,0,0.2)] backdrop-blur sm:px-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Contact</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Built with TripCoded</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Aria is a personal AI workspace by TripCoded. For collaborations, product support, or
            deployment help, connect with the TripCoded team.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:items-start lg:items-end">
          <nav className="flex flex-wrap gap-2">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/8 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[rgba(127,13,242,0.26)] bg-[rgba(127,13,242,0.1)] px-3 py-1.5 text-xs text-[var(--primary-light)]">
              Contact TripCoded
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400">
              AI Workspace
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Copyright © {year} TripCoded. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
