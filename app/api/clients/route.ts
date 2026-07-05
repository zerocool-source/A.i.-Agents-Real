import { NextRequest, NextResponse } from "next/server";
import { readDB, updateDB, uid } from "@/lib/store";
import { Client, Vertical } from "@/lib/types";

export async function GET() {
  const db = await readDB();
  return NextResponse.json({ clients: db.clients, agents: db.agents });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name?: string;
    company?: string;
    vertical?: Vertical;
    email?: string;
    notes?: string;
  };
  if (!body.name?.trim() || !body.company?.trim()) {
    return NextResponse.json(
      { error: "name and company are required" },
      { status: 400 },
    );
  }

  const client: Client = {
    id: uid("cl"),
    name: body.name.trim(),
    company: body.company.trim(),
    vertical: body.vertical ?? "other",
    email: body.email?.trim(),
    subscriptionStatus: "trial",
    mrr: 0,
    createdAt: new Date().toISOString(),
    notes: body.notes?.trim(),
  };

  await updateDB((db) => {
    db.clients.push(client);
  });

  return NextResponse.json({ client }, { status: 201 });
}
