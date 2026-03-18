import type { Metadata } from "next"
import "./globals.css"

import Navbar from "@/components/Navbar"
import SiteFooter from "@/components/SiteFooter"

export const metadata: Metadata = {
  title: "Aria | Personal AI Brain",
  description: "Aria personal AI brain for document, repository, and voice-driven knowledge work",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#05010a] text-slate-100">

        <main className="min-h-screen px-4 pb-6 pt-4 md:px-6 lg:px-8">

          <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col">

            <Navbar />

            <div className="flex-1">
              {children}
            </div>

            <SiteFooter />

          </div>

        </main>

      </body>
    </html>
  )
}
