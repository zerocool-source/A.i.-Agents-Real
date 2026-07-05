import Link from "next/link";
import { readDB } from "@/lib/store";

export const dynamic = "force-dynamic";

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function DocsPage() {
  const db = await readDB();
  return (
    <section className="section" style={{ maxWidth: 780 }}>
      <h2>
        Documents <span className="count">{db.documents.length}</span>
      </h2>
      <div className="doc-list">
        {db.documents.map((d) => {
          const client = db.clients.find((c) => c.id === d.clientId);
          return (
            <Link href={`/docs/${d.id}`} key={d.id}>
              <span>
                <span className="tag soft">{d.kind}</span>
                {client && <span className="tag">{client.company}</span>} {d.title}
              </span>
              <span className="when">{when(d.createdAt)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
