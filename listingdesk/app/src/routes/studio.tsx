import { createFileRoute } from "@tanstack/react-router";

import { Shell } from "../components/agentforge/Shell";
import { Studio } from "../components/agentforge/Studio";
import { getStudio } from "../lib/agentforge/functions";

export const Route = createFileRoute("/studio")({
  loader: () => getStudio(),
  head: () => ({
    meta: [{ title: "Studio · ListingDesk" }],
  }),
  component: StudioPage,
});

function StudioPage() {
  const data = Route.useLoaderData();
  return (
    <Shell>
      <Studio {...data} />
    </Shell>
  );
}
