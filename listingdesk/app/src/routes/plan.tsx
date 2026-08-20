import { createFileRoute } from "@tanstack/react-router";

import { MarketingPlan } from "../components/agentforge/MarketingPlan";
import { Shell } from "../components/agentforge/Shell";
import { getDocuments, getDashboard } from "../lib/agentforge/functions";

export const Route = createFileRoute("/plan")({
  loader: async () => {
    const [dash, docs] = await Promise.all([getDashboard(), getDocuments()]);
    return {
      owner: dash.owner,
      listings: dash.listings,
      documents: docs.documents.map((d) => ({ ...d, content: "" })),
    };
  },
  head: () => ({
    meta: [{ title: "Marketing plan · ListingDesk" }],
  }),
  component: PlanPage,
});

function PlanPage() {
  const data = Route.useLoaderData();
  return (
    <Shell>
      <MarketingPlan {...data} />
    </Shell>
  );
}
