import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";

import { Shell } from "../components/agentforge/Shell";
import {
  attachWalkthroughVideo,
  deleteDocument,
  getDocument,
} from "../lib/agentforge/functions";
import { renderMarkdown } from "../lib/agentforge/markdown";

export const Route = createFileRoute("/docs/$docId")({
  loader: async ({ params }) => {
    const result = await getDocument({ data: { id: params.docId } });
    if (!result.doc) throw notFound();
    return result;
  },
  component: DocPage,
});

function DocPage() {
  const { doc, listing } = Route.useLoaderData();
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  if (!doc) return null;

  async function attach() {
    if (!doc || videoUrl.trim().length < 8 || saving) return;
    setSaving(true);
    try {
      await attachWalkthroughVideo({
        data: { documentId: doc.id, url: videoUrl },
      });
      setVideoUrl("");
    } finally {
      setSaving(false);
      router.invalidate();
    }
  }

  return (
    <Shell>
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link to="/docs" className="af-back">
          ← All documents
        </Link>
        <button
          className="af-x"
          type="button"
          aria-label="Delete this document"
          onClick={async () => {
            if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`))
              return;
            await deleteDocument({ data: { id: doc.id } });
            router.navigate({ to: "/docs" });
          }}
        >
          ✕ Delete
        </button>
      </div>
      <article className="af-article">
        <div className="af-eyebrow" style={{ marginBottom: 10 }}>
          {doc.kind}
          {listing ? ` · ${listing.address}` : ""} ·{" "}
          {new Date(doc.createdAt).toLocaleDateString()}
          {doc.kind === "walkthrough" && doc.approval === "approved" && (
            <span className="af-chip live" style={{ marginLeft: 10 }}>
              In marketing ✓
            </span>
          )}
        </div>
        {doc.videoUrl && (
          <video
            className="af-video"
            src={doc.videoUrl}
            controls
            playsInline
            preload="metadata"
          />
        )}
        <div
          className="af-md"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }}
        />
        {doc.kind === "walkthrough" && !doc.videoUrl && (
          <div className="af-attach">
            <label>Rendered the video? Paste its link to play it here.</label>
            <div className="row">
              <input
                className="af-opinput"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://…/walkthrough.mp4"
                aria-label="Walkthrough video URL"
              />
              <button
                className="af-opbtn solid"
                type="button"
                disabled={saving || videoUrl.trim().length < 8}
                onClick={attach}
              >
                {saving ? "Saving…" : "Attach video"}
              </button>
            </div>
          </div>
        )}
      </article>
    </Shell>
  );
}
