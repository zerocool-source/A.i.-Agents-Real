import { NextRequest, NextResponse } from "next/server";
import { readDB, updateDB, uid } from "@/lib/store";
import { businessContext } from "@/lib/context";
import { runTaskBrain } from "@/lib/claude";
import { ActivityItem, Document, TaskStatus } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

// PATCH /api/tasks/:id — { action: "run" } executes the task with the agent
// brain and files the deliverable under Documents; { status } just moves it.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as { action?: "run"; status?: TaskStatus };

  const db = await readDB();
  const task = db.tasks.find((t) => t.id === id);
  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  if (body.action === "run") {
    // Mark in-progress immediately so a refresh shows the state.
    await updateDB((d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (t) t.status = "in-progress";
    });

    const content = await runTaskBrain(
      task.title,
      task.description,
      businessContext(db),
    );

    const doc: Document = {
      id: uid("doc"),
      title: task.title,
      kind: task.kind === "research" ? "research" : "brief",
      content,
      createdAt: new Date().toISOString(),
      clientId: task.clientId,
    };
    const activity: ActivityItem = {
      id: uid("act"),
      kind: "shipped",
      createdAt: new Date().toISOString(),
      message: `Task complete — "${task.title}". Deliverable filed under Documents.`,
    };

    const updated = await updateDB((d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (t) {
        t.status = "done";
        t.completedAt = new Date().toISOString();
        t.outputDocumentId = doc.id;
      }
      d.documents.unshift(doc);
      d.activity.push(activity);
      return t;
    });

    return NextResponse.json({ task: updated, document: doc });
  }

  if (body.status) {
    const updated = await updateDB((d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (t) {
        t.status = body.status!;
        if (body.status === "done") t.completedAt = new Date().toISOString();
      }
      return t;
    });
    return NextResponse.json({ task: updated });
  }

  return NextResponse.json({ error: "nothing to do" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await updateDB((d) => {
    d.tasks = d.tasks.filter((t) => t.id !== id);
  });
  return NextResponse.json({ ok: true });
}
