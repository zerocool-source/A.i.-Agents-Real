import { DB } from "./types";

// Compact plaintext snapshot of the business, given to the agent brain as
// context on every call.
export function businessContext(db: DB): string {
  const clients = db.clients
    .map(
      (c) =>
        `- ${c.name} (${c.company}, ${c.vertical}, ${c.subscriptionStatus}, $${c.mrr}/mo)${c.notes ? ` — ${c.notes}` : ""}`,
    )
    .join("\n");

  const agents = db.agents
    .map((a) => {
      const clientName =
        db.clients.find((c) => c.id === a.clientId)?.company ?? "unknown";
      return `- ${a.name} [${a.status}] for ${clientName} — goals: ${a.config.goals} (${a.stats.tasksCompleted} tasks, ${a.stats.leadsCaptured} leads)`;
    })
    .join("\n");

  const tasks = db.tasks
    .filter((t) => t.status !== "done")
    .map((t) => `- [${t.status}] ${t.title}`)
    .join("\n");

  const docs = db.documents.map((d) => `- ${d.title}`).join("\n");

  return `CLIENTS:\n${clients}\n\nDEPLOYED AGENTS:\n${agents}\n\nOPEN TASKS:\n${tasks}\n\nDOCUMENTS ON FILE:\n${docs}\n\nMETRICS: ${db.metrics.visitors} visitors, $${db.metrics.revenue} revenue, $${db.metrics.mrr} MRR, ${db.metrics.activeAgents} active agents.`;
}
