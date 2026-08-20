import { createFileRoute } from "@tanstack/react-router";

import { AreaSearch } from "../components/agentforge/AreaSearch";
import { Shell } from "../components/agentforge/Shell";
import { getClients } from "../lib/agentforge/functions";

export const Route = createFileRoute("/search")({
  loader: () => getClients(),
  head: () => ({
    meta: [{ title: "Area search · ListingDesk" }],
  }),
  component: SearchPage,
});

function SearchPage() {
  const data = Route.useLoaderData();
  return (
    <Shell>
      <AreaSearch
        clients={data.clients}
        listings={data.listings}
        areas={data.areas}
      />
    </Shell>
  );
}
