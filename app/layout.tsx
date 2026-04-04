import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crystal Group — Hiring System",
  description: "AI-Powered Hiring System | SOP-HR-002",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
