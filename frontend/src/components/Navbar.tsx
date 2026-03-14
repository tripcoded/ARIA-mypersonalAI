import Image from "next/image"
import Link from "next/link"
import AriaLogo from "@/AriaLogo.png"

export default function Navbar() {
  return (
    <header className="mb-6 rounded-[24px] border border-white/8 bg-[rgba(10,10,18,0.82)] px-5 py-4 shadow-lg">
      
      <div className="flex items-center justify-between gap-4">

        {/* LEFT SIDE */}
        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center text-[var(--primary-light)]">
            <Image
              src={AriaLogo}
              alt="Aria Logo"
              width={44}
              height={44}
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              Aria
            </p>

            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
              Personal AI Brain
            </p>
          </div>

        </div>

        {/* RIGHT SIDE NAV */}
        <div className="flex gap-6 text-sm text-slate-300">

          <Link href="/" className="hover:text-white">
            Workspace
          </Link>

          <Link href="/memories" className="hover:text-white">
            Memories
          </Link>

          <Link href="/settings" className="hover:text-white">
            Settings
          </Link>

        </div>

      </div>

    </header>
  )
}