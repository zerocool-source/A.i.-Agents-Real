import { NextRequest, NextResponse } from "next/server";
import { readDB, updateDB, uid } from "@/lib/store";
import { getTemplate } from "@/lib/templates";
import { ActivityItem, DeployedAgent } from "@/lib/types";

export async function GET() {
  const db = await readDB();
  return NextResponse.json({ agents: db.agents });
}

// POST /api/agents — deploy an agent from a template for a client.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    clientId?: string;
    templateId?: string;
    goals?: string;
    audience?: string;
  };

  const db = await readDB();
  const client = db.clients.find((c) => c.id === body.clientId);
  const template = getTemplate(body.templateId ?? "");
  if (!client || !template) {
    return NextResponse.json(
      { error: "valid clientId and templateId are required" },
      { status: 400 },
    );
  }

  const agent: DeployedAgent = {
    id: uid("ag"),
    clientId: client.id,
    templateId: template.id,
    name: `${client.company.split(" ")[0]} ${template.name}`,
    status: "deployed",
    deployedAt: new Date().toISOString(),
    monthlyPrice: template.monthlyPrice,
    config: {
      businessName: client.company,
      audience: body.audience?.trim() || "General audience",
      goals: body.goals?.trim() || template.tagline,
    },
    stats: { tasksCompleted: 0, leadsCaptured: 0 },
  };

  const activity: ActivityItem = {
    id: uid("act"),
    kind: "shipped",
    createdAt: new Date().toISOString(),
    message: `Deployed ${agent.name} for ${client.company} — $${template.monthlyPrice}/mo subscription.`,
  };

  await updateDB((d) => {
    d.agents.push(agent);
    d.activity.push(activity);
    d.metrics.activeAgents = d.agents.filter((a) => a.status !== "paused").length;
  });

  return NextResponse.json({ agent }, { status: 201 });
}
