import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Shell } from "../components/agentforge/Shell";
import {
  createDocument,
  deleteDocument,
  getDocuments,
} from "../lib/agentforge/functions";
import type { Document, Listing } from "../lib/agentforge/types";

export const Route = createFileRoute("/docs/")({
  loader: () => getDocuments(),
  head: () => ({
    meta: [{ title: "Documents · ListingDesk" }],
  }),
  component: DocsPage,
});

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DocsPage() {
  const { documents, listings } = Route.useLoaderData();
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove(d: Document) {
    if (!window.confirm(`Delete "${d.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteDocument({ data: { id: d.id } });
    } finally {
      setBusy(false);
      router.invalidate();
    }
  }

  return (
    <Shell>
      <div className="af-doc-head">
        <div className="rule">Archive index</div>
        <h2>Documents</h2>
        <div style={{ marginTop: 12 }}>
          <button
            className="af-opbtn"
            type="button"
            onClick={() => setShowNew(true)}
          >
            + Upload your document
          </button>
        </div>
      </div>
      <div className="af-index" style={{ maxWidth: 860, margin: "0 auto" }}>
        {documents.map((d: Document, i: number) => {
          const listing = listings.find((l: Listing) => l.id === d.listingId);
          return (
            <div className="af-index-row" key={d.id}>
              <Link to="/docs/$docId" params={{ docId: d.id }}>
                <span className="no">{String(i + 1).padStart(3, "0")}</span>
                <span>
                  <span className="title">{d.title}</span>
                  <span className="af-chip" style={{ marginLeft: 10 }}>
                    {d.kind}
                  </span>
                  {listing && (
                    <span className="af-chip">{listing.address}</span>
                  )}
                </span>
                <span className="when">{when(d.createdAt)}</span>
              </Link>
              <button
                className="af-x"
                type="button"
                aria-label={`Delete document: ${d.title}`}
                disabled={busy}
                onClick={() => remove(d)}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {showNew && (
        <NewDocumentModal
          listings={listings}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            router.invalidate();
          }}
        />
      )}
    </Shell>
  );
}

function NewDocumentModal({
  listings,
  onClose,
  onCreated,
}: {
  listings: Listing[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("report");
  const [content, setContent] = useState("");
  const [listingId, setListingId] = useState("");
  const [saving, setSaving] = useState(false);

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setContent(String(reader.result ?? ""));
      if (!title.trim()) setTitle(file.name.replace(/\.(md|txt)$/i, ""));
    };
    reader.readAsText(file);
  }

  async function submit() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    await createDocument({
      data: {
        title,
        kind: kind as
          | "report"
          | "research"
          | "walkthrough"
          | "sequence"
          | "outreach",
        content,
        listingId: listingId || undefined,
      },
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div className="af-modal-backdrop" onClick={onClose}>
      <div className="af-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Upload a document</h3>
        <div className="af-field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="af-field af-field-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <span>
            <label>Kind</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="report">Report</option>
              <option value="research">Research</option>
              <option value="walkthrough">Walkthrough</option>
              <option value="sequence">Sequence</option>
              <option value="outreach">Outreach</option>
            </select>
          </span>
          <span>
            <label>Listing (optional)</label>
            <select
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
            >
              <option value="">General</option>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.address}
                </option>
              ))}
            </select>
          </span>
        </div>
        <div className="af-field">
          <label>Upload a .md or .txt file (or paste below)</label>
          <input
            type="file"
            accept=".md,.txt,.markdown,text/plain,text/markdown"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) readFile(f);
            }}
          />
        </div>
        <div className="af-field">
          <label>Content (markdown works)</label>
          <textarea
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# My buyer guide…"
          />
        </div>
        <div className="af-modal-actions">
          <button className="af-cancel" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="af-confirm"
            onClick={submit}
            disabled={saving || !title.trim() || !content.trim()}
            type="button"
          >
            {saving ? "Filing…" : "File document"}
          </button>
        </div>
      </div>
    </div>
  );
}
