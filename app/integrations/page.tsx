import IntegrationsPanel from "@/components/IntegrationsPanel";
import { readDB } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const db = await readDB();
  // Strip stored keys before handing to the client component.
  const integrations = db.integrations.map((i) => ({
    ...i,
    apiKey: i.apiKey ? `••••${i.apiKey.slice(-4)}` : undefined,
  }));
  return <IntegrationsPanel integrations={integrations} />;
}
