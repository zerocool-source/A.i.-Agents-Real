import { createFileRoute } from "@tanstack/react-router";

import { IntegrationsPanel } from "../components/agentforge/IntegrationsPanel";
import { Shell } from "../components/agentforge/Shell";
import { getIntegrations } from "../lib/agentforge/functions";

export const Route = createFileRoute("/integrations")({
  loader: () => getIntegrations(),
  head: () => ({
    meta: [{ title: "Integrations · ListingDesk" }],
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const { integrations, keys } = Route.useLoaderData();
  return (
    <Shell>
      <IntegrationsPanel integrations={integrations} keys={keys} />
    </Shell>
  );
}
