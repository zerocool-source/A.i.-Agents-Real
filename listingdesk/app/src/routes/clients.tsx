import { createFileRoute } from "@tanstack/react-router";

import { Clients } from "../components/agentforge/Clients";
import { Shell } from "../components/agentforge/Shell";
import { getClients } from "../lib/agentforge/functions";

export const Route = createFileRoute("/clients")({
  loader: () => getClients(),
  head: () => ({
    meta: [{ title: "Clients & buyers · ListingDesk" }],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const data = Route.useLoaderData();
  return (
    <Shell>
      <Clients {...data} />
    </Shell>
  );
}
