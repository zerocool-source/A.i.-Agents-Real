import Link from "next/link";
import { notFound } from "next/navigation";
import { readDB } from "@/lib/store";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export default async function DocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await readDB();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) notFound();

  const client = db.clients.find((c) => c.id === doc.clientId);

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 14 }}>
        <Link href="/docs" className="kicker" style={{ textDecoration: "none" }}>
          ← All documents
        </Link>
      </div>
      <div className="kicker" style={{ marginBottom: 8 }}>
        {doc.kind}
        {client ? ` · ${client.company}` : ""} ·{" "}
        {new Date(doc.createdAt).toLocaleString()}
      </div>
      <article
        className="md"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }}
      />
    </div>
  );
}
