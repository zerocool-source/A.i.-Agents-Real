"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ActivityItem,
  AgentTemplate,
  ChatMessage,
  Client,
  DeployedAgent,
  Document,
  Metrics,
  Task,
} from "@/lib/types";
import { renderMarkdown } from "@/lib/markdown";

const MASCOT = `  /\\_/\\
 ( o.o )   AgentForge
  > ^ <    v0.1`;

interface Props {
  clients: Client[];
  agents: DeployedAgent[];
  tasks: Task[];
  documents: Document[];
  activity: ActivityItem[];
  chat: ChatMessage[];
  metrics: Metrics;
  templates: AgentTemplate[];
}

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Dashboard(props: Props) {
  const router = useRouter();
  return (
    <div className="grid">
      <LeftRail {...props} />
      <MiddleColumn {...props} onChanged={() => router.refresh()} />
      <ClientsColumn {...props} onChanged={() => router.refresh()} />
      <FeedColumn {...props} onChanged={() => router.refresh()} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LeftRail({ metrics, agents, clients }: Props) {
  const activeAgents = agents.filter((a) => a.status !== "paused").length;
  const mrr = clients.reduce((sum, c) => sum + c.mrr, 0);
  return (
    <div>
      <section className="section">
        <h2>Status</h2>
        <div className="mascot">{MASCOT}</div>
        <div className="kicker">Shipped</div>
        <p style={{ fontSize: 13.5, marginTop: 4 }}>
          Working while you sleep — agents deployed, research filed, outreach
          queued.
        </p>
        <div className="pricing">
          <h3>
            Hire Your
            <br />
            AI Employee
          </h3>
          <div className="sub">$6.67/day · works while you sleep</div>
          <button className="primary" style={{ width: "100%" }}>
            Subscribe — $200/mo
          </button>
          <div className="sub" style={{ marginBottom: 0, marginTop: 10 }}>
            per deployed agent · cancel anytime
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Business</h2>
        <div className="statline">
          <span>Visitors</span>
          <b>{metrics.visitors}</b>
        </div>
        <div className="statline">
          <span>Revenue</span>
          <b>${metrics.revenue.toFixed(2)}</b>
        </div>
        <div className="statline">
          <span>MRR</span>
          <b>${mrr}</b>
        </div>
        <div className="statline">
          <span>Active agents</span>
          <b>{activeAgents}</b>
        </div>
        <div className="statline">
          <span>Clients</span>
          <b>{clients.length}</b>
        </div>
        <div className="kicker" style={{ marginTop: 8 }}>
          Updated {timeAgo(metrics.updatedAt)}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MiddleColumn({
  tasks,
  documents,
  clients,
  onChanged,
}: Props & { onChanged: () => void }) {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  async function runTask(id: string) {
    setRunningId(id);
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
    } finally {
      setRunningId(null);
      onChanged();
    }
  }

  return (
    <div>
      <section className="section">
        <h2>
          Tasks <span className="count">{open.length} open</span>
        </h2>
        {open.map((t) => (
          <div className="card" key={t.id}>
            <h3>{t.title}</h3>
            <p>{t.description}</p>
            <div className="row">
              <div>
                {t.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`tag ${tag === "TONIGHT" ? "hot" : ""}`}
                  >
                    {tag}
                  </span>
                ))}
                {t.status === "in-progress" && (
                  <span className="tag hot">IN PROGRESS</span>
                )}
              </div>
              <button onClick={() => runTask(t.id)} disabled={runningId !== null}>
                {runningId === t.id ? (
                  <>
                    Running<span className="spin">…</span>
                  </>
                ) : (
                  "Run"
                )}
              </button>
            </div>
          </div>
        ))}
        {open.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Queue is clear. Add a task and let an agent run it.
          </p>
        )}
        <button onClick={() => setShowNewTask(true)}>+ New task</button>
        {done.length > 0 && (
          <div className="kicker" style={{ marginTop: 10 }}>
            {done.length} completed — deliverables filed under Documents
          </div>
        )}
      </section>

      <section className="section">
        <h2>
          Documents <span className="count">{documents.length}</span>
        </h2>
        <div className="doc-list">
          {documents.slice(0, 8).map((d) => (
            <Link href={`/docs/${d.id}`} key={d.id}>
              <span>
                <span className="tag soft">{d.kind}</span> {d.title}
              </span>
              <span className="when">{timeAgo(d.createdAt)}</span>
            </Link>
          ))}
        </div>
        {documents.length > 8 && (
          <div style={{ marginTop: 10 }}>
            <Link href="/docs" className="kicker">
              View all →
            </Link>
          </div>
        )}
      </section>

      {showNewTask && (
        <NewTaskModal
          clients={clients}
          onClose={() => setShowNewTask(false)}
          onCreated={() => {
            setShowNewTask(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function NewTaskModal({
  clients,
  onClose,
  onCreated,
}: {
  clients: Client[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("research");
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        kind,
        clientId: clientId || undefined,
      }),
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>New Task</h3>
        <div className="field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>Brief — what should the agent produce?</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Kind</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="research">Research</option>
            <option value="outreach">Outreach</option>
            <option value="content">Content</option>
            <option value="feature">Feature</option>
            <option value="ops">Ops</option>
          </select>
        </div>
        <div className="field">
          <label>Client (optional)</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">— Internal —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Queue task"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ClientsColumn({
  clients,
  agents,
  templates,
  onChanged,
}: Props & { onChanged: () => void }) {
  const [deployFor, setDeployFor] = useState<Client | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);

  return (
    <div>
      <section className="section">
        <h2>
          Clients <span className="count">{clients.length}</span>
        </h2>
        {clients.map((c) => {
          const clientAgents = agents.filter((a) => a.clientId === c.id);
          return (
            <div className="card plain" key={c.id}>
              <div className="row">
                <h3>{c.company}</h3>
                <span
                  className={`tag ${c.subscriptionStatus === "active" ? "" : "soft"}`}
                >
                  {c.subscriptionStatus === "active"
                    ? `$${c.mrr}/mo`
                    : c.subscriptionStatus}
                </span>
              </div>
              <div className="meta" style={{ marginBottom: 6 }}>
                {c.name} · {c.vertical}
              </div>
              {c.notes && <p>{c.notes}</p>}
              {clientAgents.map((a) => (
                <div className="statline" key={a.id}>
                  <span>
                    ▸ {a.name}{" "}
                    <span className={`tag ${a.status === "deployed" ? "" : "hot"}`}>
                      {a.status}
                    </span>
                  </span>
                  <b>
                    {a.stats.leadsCaptured} leads
                  </b>
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <button onClick={() => setDeployFor(c)}>Deploy agent</button>
              </div>
            </div>
          );
        })}
        <button onClick={() => setShowNewClient(true)}>+ New client</button>
      </section>

      <section className="section">
        <h2>Agent Templates</h2>
        {templates
          .filter((t) => t.id !== "custom")
          .map((t) => (
            <div className="card" key={t.id}>
              <h3>{t.name}</h3>
              <p>{t.tagline}</p>
              <div className="meta">
                {t.vertical} · ${t.monthlyPrice}/mo
              </div>
            </div>
          ))}
      </section>

      {deployFor && (
        <DeployModal
          client={deployFor}
          templates={templates}
          onClose={() => setDeployFor(null)}
          onDeployed={() => {
            setDeployFor(null);
            onChanged();
          }}
        />
      )}
      {showNewClient && (
        <NewClientModal
          onClose={() => setShowNewClient(false)}
          onCreated={() => {
            setShowNewClient(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function DeployModal({
  client,
  templates,
  onClose,
  onDeployed,
}: {
  client: Client;
  templates: AgentTemplate[];
  onClose: () => void;
  onDeployed: () => void;
}) {
  const defaultTemplate = useMemo(
    () =>
      templates.find((t) => t.vertical === client.vertical)?.id ??
      templates[0].id,
    [client, templates],
  );
  const [templateId, setTemplateId] = useState<string>(defaultTemplate);
  const [goals, setGoals] = useState("");
  const [audience, setAudience] = useState("");
  const [saving, setSaving] = useState(false);
  const selected = templates.find((t) => t.id === templateId);

  async function submit() {
    setSaving(true);
    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, templateId, goals, audience }),
    });
    setSaving(false);
    onDeployed();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Deploy agent — {client.company}</h3>
        <div className="field">
          <label>Template</label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — ${t.monthlyPrice}/mo
              </option>
            ))}
          </select>
        </div>
        {selected && (
          <p style={{ fontSize: 13, color: "#444", marginBottom: 12 }}>
            {selected.description}
          </p>
        )}
        <div className="field">
          <label>Audience</label>
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Who is this agent talking to?"
          />
        </div>
        <div className="field">
          <label>Goals</label>
          <textarea
            rows={3}
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="What does success look like for this client?"
          />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={submit} disabled={saving}>
            {saving ? "Deploying…" : "Deploy — $200/mo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [vertical, setVertical] = useState("real-estate");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim() || !company.trim()) return;
    setSaving(true);
    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, company, vertical, notes }),
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>New Client</h3>
        <div className="field">
          <label>Contact name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Company</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div className="field">
          <label>Vertical</label>
          <select value={vertical} onChange={(e) => setVertical(e.target.value)}>
            <option value="real-estate">Real Estate</option>
            <option value="solar">Solar</option>
            <option value="clothing">Clothing / Brand</option>
            <option value="home-services">Home Services</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="field">
          <label>Notes — what do they need?</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Add client"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FeedColumn({
  activity,
  chat,
  onChanged,
}: Props & { onChanged: () => void }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  async function send() {
    const message = input.trim();
    if (!message || sending) return;
    setSending(true);
    setInput("");
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
    } finally {
      setSending(false);
      onChanged();
    }
  }

  const items: Array<
    | { type: "activity"; item: ActivityItem }
    | { type: "chat"; item: ChatMessage }
  > = [
    ...activity.map((item) => ({ type: "activity" as const, item })),
    ...chat.map((item) => ({ type: "chat" as const, item })),
  ].sort(
    (a, b) =>
      new Date(a.item.createdAt).getTime() - new Date(b.item.createdAt).getTime(),
  );

  return (
    <div>
      <section className="section">
        <h2>Agent Feed</h2>
        <div className="feed" ref={feedRef}>
          {items.slice(-30).map((entry) =>
            entry.type === "activity" ? (
              <div className="bubble" key={entry.item.id}>
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(entry.item.message),
                  }}
                  className="md"
                />
                <div className="meta">
                  {entry.item.kind} · {timeAgo(entry.item.createdAt)}
                </div>
              </div>
            ) : (
              <div
                className={`bubble ${entry.item.role === "user" ? "user" : ""}`}
                key={entry.item.id}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(entry.item.content),
                  }}
                  className="md"
                />
                <div className="meta">
                  {entry.item.role === "user" ? "you" : "agentforge"} ·{" "}
                  {timeAgo(entry.item.createdAt)}
                </div>
              </div>
            ),
          )}
          {sending && (
            <div className="bubble">
              Thinking<span className="spin">…</span>
            </div>
          )}
        </div>
        <div className="chatbox">
          <input
            placeholder="Ask AgentForge anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            disabled={sending}
          />
          <button className="primary" onClick={send} disabled={sending}>
            Send
          </button>
        </div>
      </section>
    </div>
  );
}
