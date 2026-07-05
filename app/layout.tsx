import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentForge — Hire Your AI Employee",
  description:
    "Deploy purpose-built AI agents for real estate, solar, and small-business clients. $200/mo. Works while you sleep.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="masthead">
            <div>
              <h1>AgentForge</h1>
              <div className="kicker">
                AI infrastructure · purpose-built agents · deployed in minutes
              </div>
            </div>
            <nav className="nav">
              <Link href="/">Dashboard</Link>
              <Link href="/integrations">CRM / ERP</Link>
              <Link href="/docs">Documents</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
