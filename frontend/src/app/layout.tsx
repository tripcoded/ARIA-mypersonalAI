import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Aria | Personal AI Brain",
  description: "Aria personal AI brain for document, repository, and voice-driven knowledge work",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
