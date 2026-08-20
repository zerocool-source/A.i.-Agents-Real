import { createFileRoute } from "@tanstack/react-router";

import { Dashboard } from "../components/agentforge/Dashboard";
import { Shell } from "../components/agentforge/Shell";
import { getDashboard } from "../lib/agentforge/functions";

export const Route = createFileRoute("/")({
  // Home inherits the app's editable page metadata from the root route.
  loader: () => getDashboard(),
  component: Index,
});

function Index() {
  const data = Route.useLoaderData();
  return (
    <Shell>
      <Dashboard {...data} />
    </Shell>
  );
}
