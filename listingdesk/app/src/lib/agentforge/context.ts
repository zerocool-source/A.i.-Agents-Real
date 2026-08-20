import { DB } from "./types";

// Compact plaintext snapshot of the desk, given to the agent brain as
// context on every call.
export function businessContext(db: DB): string {
  const listings = db.listings
    .map(
      (l) =>
        `- ${l.address}, ${l.city} [${l.status}] $${l.price.toLocaleString()}, ${l.beds}bd/${l.baths}ba, ${l.sqft} sqft, ${l.leadCount} leads. Features: ${l.features}${l.notes ? `. Notes: ${l.notes}` : ""}`,
    )
    .join("\n");

  const tasks = db.tasks
    .filter((t) => t.status !== "done")
    .map((t) => `- [${t.status}] ${t.title}`)
    .join("\n");

  const docs = db.documents.map((d) => `- ${d.title}`).join("\n");

  return `AGENT: ${db.owner.name} Smith, ${db.owner.brokerage}, ${db.owner.dre}, serving ${db.owner.serviceArea}.\n\nLISTINGS:\n${listings}\n\nOPEN TASKS:\n${tasks}\n\nDOCUMENTS ON FILE:\n${docs}\n\nMETRICS: ${db.metrics.leadsThisWeek} leads this week, ${db.metrics.showings} showings booked, ${db.metrics.walkthroughs} walkthroughs made.`;
}
