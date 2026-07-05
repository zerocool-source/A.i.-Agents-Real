import { NextRequest, NextResponse } from "next/server";
import { readDB, updateDB, uid } from "@/lib/store";
import { Task, TaskKind } from "@/lib/types";

export async function GET() {
  const db = await readDB();
  return NextResponse.json({ tasks: db.tasks });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    title?: string;
    description?: string;
    kind?: TaskKind;
    clientId?: string;
    tags?: string[];
  };
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const task: Task = {
    id: uid("t"),
    title: body.title.trim(),
    description: body.description?.trim() ?? "",
    kind: body.kind ?? "ops",
    status: "queued",
    tags: body.tags?.length ? body.tags : [(body.kind ?? "ops").toUpperCase()],
    clientId: body.clientId,
    createdAt: new Date().toISOString(),
  };

  await updateDB((db) => {
    db.tasks.unshift(task);
  });

  return NextResponse.json({ task }, { status: 201 });
}
