import { NextRequest, NextResponse } from "next/server";
import { readDB, updateDB, uid } from "@/lib/store";
import { businessContext } from "@/lib/context";
import { askBrain } from "@/lib/claude";
import { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  const db = await readDB();
  return NextResponse.json({ messages: db.chat });
}

export async function POST(req: NextRequest) {
  const { message } = (await req.json()) as { message?: string };
  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const db = await readDB();
  const answer = await askBrain(message.trim(), businessContext(db));

  const userMsg: ChatMessage = {
    id: uid("msg"),
    role: "user",
    content: message.trim(),
    createdAt: new Date().toISOString(),
  };
  const assistantMsg: ChatMessage = {
    id: uid("msg"),
    role: "assistant",
    content: answer,
    createdAt: new Date().toISOString(),
  };

  await updateDB((d) => {
    d.chat.push(userMsg, assistantMsg);
    // Keep chat history bounded.
    if (d.chat.length > 200) d.chat = d.chat.slice(-200);
  });

  return NextResponse.json({ messages: [userMsg, assistantMsg] });
}
