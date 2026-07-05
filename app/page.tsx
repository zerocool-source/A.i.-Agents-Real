import Dashboard from "@/components/Dashboard";
import { readDB } from "@/lib/store";
import { AGENT_TEMPLATES } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await readDB();
  return (
    <Dashboard
      clients={db.clients}
      agents={db.agents}
      tasks={db.tasks}
      documents={db.documents}
      activity={db.activity}
      chat={db.chat}
      metrics={db.metrics}
      templates={AGENT_TEMPLATES}
    />
  );
}
