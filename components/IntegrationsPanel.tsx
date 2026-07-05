"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Integration, IntegrationCategory } from "@/lib/types";

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  crm: "CRM",
  erp: "ERP",
  marketing: "Marketing",
  comms: "Comms",
};

export default function IntegrationsPanel({
  integrations,
}: {
  integrations: Integration[];
}) {
  const router = useRouter();
  const [connecting, setConnecting] = useState<Integration | null>(null);
  const categories: IntegrationCategory[] = ["crm", "erp", "marketing", "comms"];

  async function disconnect(id: string) {
    await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, disconnect: true }),
    });
    router.refresh();
  }

  return (
    <div>
      <section className="section" style={{ maxWidth: 900 }}>
        <h2>CRM / ERP Connections</h2>
        <p style={{ fontSize: 13.5, color: "#444", marginBottom: 16 }}>
          Connect your clients&apos; systems so deployed agents can read leads,
          write follow-ups, and file activity where the client already works.
          Keys are stored server-side and never rendered back in full.
        </p>
        {categories.map((cat) => {
          const items = integrations.filter((i) => i.category === cat);
          if (!items.length) return null;
          return (
            <div key={cat} style={{ marginBottom: 22 }}>
              <div className="kicker" style={{ marginBottom: 8 }}>
                {CATEGORY_LABELS[cat]}
              </div>
              {items.map((i) => (
                <div className="card plain" key={i.id}>
                  <div className="row">
                    <div>
                      <h3>
                        {i.name}{" "}
                        {i.connected && <span className="tag">connected</span>}
                      </h3>
                      <p style={{ marginBottom: 0 }}>{i.description}</p>
                      {i.connected && i.apiKey && (
                        <div className="meta" style={{ marginTop: 6 }}>
                          key {i.apiKey} · since{" "}
                          {i.connectedAt
                            ? new Date(i.connectedAt).toLocaleDateString()
                            : "—"}
                        </div>
                      )}
                    </div>
                    {i.connected ? (
                      <button onClick={() => disconnect(i.id)}>Disconnect</button>
                    ) : (
                      <button className="primary" onClick={() => setConnecting(i)}>
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </section>

      {connecting && (
        <ConnectModal
          integration={connecting}
          onClose={() => setConnecting(null)}
          onDone={() => {
            setConnecting(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ConnectModal({
  integration,
  onClose,
  onDone,
}: {
  integration: Integration;
  onClose: () => void;
  onDone: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!apiKey.trim()) return;
    setSaving(true);
    await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: integration.id, apiKey }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Connect {integration.name}</h3>
        <p style={{ fontSize: 13.5, marginBottom: 14 }}>{integration.description}</p>
        <div className="field">
          <label>API key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste the client's API key"
          />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={submit} disabled={saving}>
            {saving ? "Connecting…" : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
