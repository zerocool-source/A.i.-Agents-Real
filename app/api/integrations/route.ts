import { NextRequest, NextResponse } from "next/server";
import { readDB, updateDB } from "@/lib/store";

function masked(key?: string): string | undefined {
  if (!key) return undefined;
  return key.length <= 4 ? "****" : `••••${key.slice(-4)}`;
}

export async function GET() {
  const db = await readDB();
  // Never send stored API keys back to the browser.
  const integrations = db.integrations.map((i) => ({
    ...i,
    apiKey: masked(i.apiKey),
  }));
  return NextResponse.json({ integrations });
}

// POST /api/integrations — { id, apiKey } connects, { id, disconnect: true } disconnects.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    id?: string;
    apiKey?: string;
    disconnect?: boolean;
  };

  const updated = await updateDB((db) => {
    const integration = db.integrations.find((i) => i.id === body.id);
    if (!integration) return null;
    if (body.disconnect) {
      integration.connected = false;
      integration.apiKey = undefined;
      integration.connectedAt = undefined;
    } else if (body.apiKey?.trim()) {
      integration.connected = true;
      integration.apiKey = body.apiKey.trim();
      integration.connectedAt = new Date().toISOString();
    }
    return integration;
  });

  if (!updated) {
    return NextResponse.json({ error: "integration not found" }, { status: 404 });
  }
  return NextResponse.json({
    integration: { ...updated, apiKey: masked(updated.apiKey) },
  });
}
