import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

import {
  connectIntegration,
  setDeskKeys,
} from "../../lib/agentforge/functions";
import type {
  Integration,
  IntegrationCategory,
} from "../../lib/agentforge/types";

export interface DeskKeys {
  anthropic?: string;
  apify?: string;
  brainLive: boolean;
}

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  crm: "CRM",
  mls: "MLS & portals",
  marketing: "Marketing",
  comms: "Comms",
};

export function IntegrationsPanel({
  integrations,
  keys,
}: {
  integrations: Integration[];
  keys: DeskKeys;
}) {
  const router = useRouter();
  const [connecting, setConnecting] = useState<Integration | null>(null);
  const categories: IntegrationCategory[] = ["crm", "mls", "marketing", "comms"];

  async function disconnect(id: string) {
    await connectIntegration({ data: { id, disconnect: true } });
    router.invalidate();
  }

  return (
    <div className="af-int-grid">
      <aside className="af-int-intro">
        <div className="plate" aria-hidden="true">
          <svg viewBox="0 0 64 40" focusable="false">
            <path
              d="M4 30 L32 6 L60 30"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="44"
              y="10"
              width="7"
              height="12"
              rx="1.5"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="body">
          <div className="af-eyebrow">Connections</div>
          <h2>Integrations</h2>
          <p>
            Wire your tools into the desk: CRM, MLS, marketing, and messaging.
            The desk reads new leads, pulls listing data, and fires follow-ups
            where you already work. Keys stay server-side and are never shown
            in full again.
          </p>
        </div>
      </aside>

      <div>
        <KeysPanel keys={keys} onChanged={() => router.invalidate()} />
        {categories.map((cat) => {
          const items = integrations.filter((i) => i.category === cat);
          if (!items.length) return null;
          return (
            <div key={cat}>
              <div className="af-group-label">
                {CATEGORY_LABELS[cat]}
                <span className="line" />
              </div>
              {items.map((i) => (
                <div className="af-connector" key={i.id}>
                  <div className="af-mono-tile">{i.name.charAt(0)}</div>
                  <div className="info">
                    <h3>{i.name}</h3>
                    <p>{i.description}</p>
                    {i.connected && i.apiKey && (
                      <div className="meta">
                        key {i.apiKey} · since{" "}
                        {i.connectedAt
                          ? new Date(i.connectedAt).toLocaleDateString()
                          : "today"}
                      </div>
                    )}
                  </div>
                  <button
                    className={`af-switch ${i.connected ? "on" : ""}`}
                    onClick={() =>
                      i.connected ? disconnect(i.id) : setConnecting(i)
                    }
                    aria-label={
                      i.connected
                        ? `Disconnect ${i.name}`
                        : `Connect ${i.name}`
                    }
                    aria-pressed={i.connected}
                    type="button"
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {connecting && (
        <ConnectModal
          integration={connecting}
          onClose={() => setConnecting(null)}
          onDone={() => {
            setConnecting(null);
            router.invalidate();
          }}
        />
      )}
    </div>
  );
}

function KeysPanel({
  keys,
  onChanged,
}: {
  keys: DeskKeys;
  onChanged: () => void;
}) {
  const [anthropic, setAnthropic] = useState("");
  const [apify, setApify] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function save(which: "anthropic" | "apify") {
    const value = which === "anthropic" ? anthropic.trim() : apify.trim();
    if (!value || busy) return;
    setBusy(which);
    try {
      await setDeskKeys({
        data:
          which === "anthropic"
            ? { anthropicKey: value }
            : { apifyToken: value },
      });
      if (which === "anthropic") setAnthropic("");
      else setApify("");
    } finally {
      setBusy(null);
      onChanged();
    }
  }

  async function clear(which: "anthropic" | "apify") {
    if (!window.confirm("Remove this key from the desk?") || busy) return;
    setBusy(which);
    try {
      await setDeskKeys({ data: { clear: which } });
    } finally {
      setBusy(null);
      onChanged();
    }
  }

  return (
    <div className="af-keys">
      <div className="af-group-label">
        Your keys
        <span className="line" />
        <span className={`af-chip ${keys.brainLive ? "live" : ""}`}>
          Brain: {keys.brainLive ? "live" : "demo mode"}
        </span>
      </div>
      <div className="af-keyrow">
        <div className="info">
          <h3>Anthropic API key</h3>
          <p>
            Powers the desk brain: chat, walkthroughs, campaigns, follow-ups.
            {keys.anthropic ? ` Saved: ${keys.anthropic}` : " Not set."}
          </p>
        </div>
        <div className="acts">
          <input
            className="af-opinput"
            type="password"
            placeholder="sk-ant-…"
            value={anthropic}
            onChange={(e) => setAnthropic(e.target.value)}
            aria-label="Anthropic API key"
          />
          <button
            className="af-opbtn solid"
            type="button"
            disabled={busy !== null || !anthropic.trim()}
            onClick={() => save("anthropic")}
          >
            {busy === "anthropic" ? "Saving…" : "Save"}
          </button>
          {keys.anthropic && (
            <button
              className="af-opbtn ghost"
              type="button"
              disabled={busy !== null}
              onClick={() => clear("anthropic")}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <div className="af-keyrow">
        <div className="info">
          <h3>Apify token</h3>
          <p>
            Lets the walkthrough video pipeline pull photos from Zillow links.
            {keys.apify ? ` Saved: ${keys.apify}` : " Not set."}
          </p>
        </div>
        <div className="acts">
          <input
            className="af-opinput"
            type="password"
            placeholder="apify_api_…"
            value={apify}
            onChange={(e) => setApify(e.target.value)}
            aria-label="Apify token"
          />
          <button
            className="af-opbtn solid"
            type="button"
            disabled={busy !== null || !apify.trim()}
            onClick={() => save("apify")}
          >
            {busy === "apify" ? "Saving…" : "Save"}
          </button>
          {keys.apify && (
            <button
              className="af-opbtn ghost"
              type="button"
              disabled={busy !== null}
              onClick={() => clear("apify")}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <p className="note">
        Keys are stored server-side in your desk's database and shown only as
        the last four characters. Remove them here anytime.
      </p>
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
    await connectIntegration({ data: { id: integration.id, apiKey } });
    setSaving(false);
    onDone();
  }

  return (
    <div className="af-modal-backdrop" onClick={onClose}>
      <div className="af-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Connect {integration.name}</h3>
        <p style={{ fontSize: 13.5, marginBottom: 14, color: "var(--af-muted)" }}>
          {integration.description}
        </p>
        <div className="af-field">
          <label>API key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your API key"
          />
        </div>
        <div className="af-modal-actions">
          <button className="af-cancel" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="af-confirm"
            onClick={submit}
            disabled={saving}
            type="button"
          >
            {saving ? "Connecting…" : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
