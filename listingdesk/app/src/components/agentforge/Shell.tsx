import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="af-shell">
      <div className="af-frame">
        <nav className="af-nav">
          <Link to="/" className="af-brand">
            <img src="/assets/favicon.png" alt="ListingDesk roofline mark" />
            <span>
              <b>ListingDesk</b>
              <span className="sub">Leslie Smith · KW The Lakes</span>
            </span>
          </Link>
          <div className="af-links">
            <Link to="/">Desk</Link>
            <Link to="/search">Area search</Link>
            <Link to="/clients">Clients</Link>
            <Link to="/studio">Studio</Link>
            <Link to="/plan">Marketing plan</Link>
            <Link to="/docs">Documents</Link>
            <Link to="/integrations">Integrations</Link>
          </div>
        </nav>
        {children}
      </div>
    </div>
  );
}

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
