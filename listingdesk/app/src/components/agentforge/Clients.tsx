import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { parsePrice } from "../../lib/agentforge/price";
import {
  addClient,
  deleteClient,
  draftClientFollowUp,
  generateBuyerGuide,
  logClientTouch,
  removeSavedHome,
  setClientStage,
  updateClient,
} from "../../lib/agentforge/functions";
import type {
  Client,
  ClientKind,
  ClientStage,
  Document,
  Listing,
  Owner,
} from "../../lib/agentforge/types";
import { CLIENT_KINDS, CLIENT_STAGES } from "../../lib/agentforge/types";
import { timeAgo } from "./Shell";

export interface ClientsData {
  owner: Owner;
  clients: Client[];
  listings: Listing[];
  documents: Document[];
  areas: { id: string; label: string }[];
}

const DAY = 86_400_000;

function dueIn(iso?: string): { days: number; label: string; tone: string } {
  if (!iso) return { days: 999, label: "No follow-up set", tone: "none" };
  const days = Math.floor((new Date(iso).getTime() - Date.now()) / DAY);
  if (days < -1)
    return { days, label: `${Math.abs(days)} days overdue`, tone: "overdue" };
  if (days < 0) return { days, label: "Overdue", tone: "overdue" };
  if (days === 0) return { days, label: "Due today", tone: "today" };
  if (days === 1) return { days, label: "Tomorrow", tone: "soon" };
  return { days, label: `In ${days} days`, tone: "later" };
}

const money = (n?: number) =>
  typeof n === "number" && n > 0 ? `$${n.toLocaleString("en-US")}` : "";

export function Clients(props: ClientsData) {
  const router = useRouter();
  const refresh = () => router.invalidate();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | ClientKind>("all");

  const clients = props.clients ?? [];
  const queue = [...clients]
    .filter((c) => c.stage !== "closed" || dueIn(c.nextFollowUp).days <= 0)
    .sort(
      (a, b) =>
        new Date(a.nextFollowUp ?? "2999-01-01").getTime() -
        new Date(b.nextFollowUp ?? "2999-01-01").getTime(),
    );
  const dueNow = queue.filter((c) => dueIn(c.nextFollowUp).days <= 0);
  const firstTimers = clients.filter((c) => c.kind === "first-time");
  const shown =
    filter === "all" ? clients : clients.filter((c) => c.kind === filter);

  return (
    <>
      <div className="af-doc-head">
        <div className="rule">Clients &amp; buyers</div>
        <h2>Nobody falls through the cracks.</h2>
        <p className="af-hint">
          Her buyers, her sellers, and every first-timer she is walking through
          their first purchase — on the Keller Williams home purchasing process,
          with the follow-up queue front and center.
        </p>
      </div>

      <section className="af-moneyband af-clientstats">
        <div className="mb escrow">
          <b>{dueNow.length}</b>
          <span>Follow-ups due now</span>
        </div>
        <div className="mb live">
          <b>{clients.filter((c) => c.kind !== "past").length}</b>
          <span>Active clients</span>
        </div>
        <div className="mb gci">
          <b>{firstTimers.length}</b>
          <span>First-time buyers in the process</span>
        </div>
        <div className="mb sold">
          <b>{clients.reduce((n, c) => n + (c.savedHomes?.length ?? 0), 0)}</b>
          <span>Homes saved for clients</span>
        </div>
      </section>

      <section className="af-section af-queue">
        <header>
          <h2>Who to call today</h2>
          <button
            className="af-opbtn"
            type="button"
            onClick={() => setShowAdd((v) => !v)}
          >
            {showAdd ? "Close" : "+ Add a client"}
          </button>
        </header>
        {showAdd && (
          <AddClientForm
            listings={props.listings}
            onDone={() => {
              setShowAdd(false);
              refresh();
            }}
          />
        )}
        {dueNow.length === 0 ? (
          <p className="af-hint">
            Queue is clear. Next call is{" "}
            {queue[0] ? `${queue[0].name} — ${dueIn(queue[0].nextFollowUp).label.toLowerCase()}` : "not scheduled yet"}.
          </p>
        ) : (
          <div className="af-queuelist">
            {dueNow.map((c) => {
              const d = dueIn(c.nextFollowUp);
              return (
                <div className={`af-queuerow ${d.tone}`} key={c.id}>
                  <span className="who">
                    <b>{c.name}</b>
                    <i>
                      {CLIENT_KINDS.find((k) => k.id === c.kind)?.label} ·{" "}
                      {CLIENT_STAGES.find((s) => s.id === c.stage)?.label}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </i>
                  </span>
                  <span className={`due ${d.tone}`}>{d.label}</span>
                  <a className="af-opbtn" href={`#client-${c.id}`}>
                    Open →
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <BuyerProcess clients={clients} />

      <section className="af-section">
        <header>
          <h2>The book</h2>
          <div className="af-sortrow">
            <select
              aria-label="Filter clients"
              value={filter}
              onChange={(e) => setFilter(e.target.value as "all" | ClientKind)}
            >
              <option value="all">Everyone</option>
              {CLIENT_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}s
                </option>
              ))}
            </select>
          </div>
        </header>
        {shown.length === 0 && (
          <p className="af-hint">
            No one here yet. Add her first client above, or save homes to a
            buyer from <Link to="/search">Area search</Link>.
          </p>
        )}
        {shown.map((c) => (
          <ClientCard
            key={c.id}
            client={c}
            documents={props.documents}
            onChanged={refresh}
          />
        ))}
      </section>
    </>
  );
}

/* The KW home purchasing process, with her buyers standing on it. */
function BuyerProcess({ clients }: { clients: Client[] }) {
  return (
    <section className="af-section af-process">
      <header>
        <h2>The home purchasing process</h2>
        <span className="count">Keller Williams</span>
      </header>
      <p className="af-hint">
        The same steps she walks a first-time buyer through at the kitchen
        table. Each dot is a client standing on that step right now.
      </p>
      <ol className="af-processrow">
        {CLIENT_STAGES.map((s, i) => {
          const here = clients.filter((c) => c.stage === s.id);
          return (
            <li key={s.id} className={here.length ? "on" : ""}>
              <span className="n">{i + 1}</span>
              <b>{s.label}</b>
              <i>{s.note}</i>
              {here.length > 0 && (
                <span className="who">
                  {here.map((c) => (
                    <a key={c.id} href={`#client-${c.id}`}>
                      {c.name}
                    </a>
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function AddClientForm({
  listings,
  onDone,
}: {
  listings: Listing[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ClientKind>("first-time");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [cities, setCities] = useState("");
  const [beds, setBeds] = useState("");
  const [timeline, setTimeline] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [listingId, setListingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (saving) return;
    if (!name.trim()) {
      setErr("Give them a name and she can start the file.");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      await addClient({
        data: {
          name,
          kind,
          phone,
          email,
          budgetMin: parsePrice(budgetMin) || undefined,
          budgetMax: parsePrice(budgetMax) || undefined,
          cities: cities
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          beds: Number(beds) || undefined,
          timeline,
          source,
          notes,
          listingId: listingId || undefined,
        },
      });
    } finally {
      setSaving(false);
      onDone();
    }
  }

  return (
    <div className="af-addclient">
      <div
        className="af-field af-field-row"
        style={{ gridTemplateColumns: "2fr 1fr 1fr" }}
      >
        <span>
          <label>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Marisol & Andre Ruiz"
          />
        </span>
        <span>
          <label>They are</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ClientKind)}
          >
            {CLIENT_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </span>
        <span>
          <label>Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="951-555-0142"
          />
        </span>
      </div>
      <div
        className="af-field af-field-row"
        style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}
      >
        <span>
          <label>Budget from</label>
          <input
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            placeholder="480k"
          />
        </span>
        <span>
          <label>Budget to</label>
          <input
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            placeholder="560k"
          />
        </span>
        <span>
          <label>Beds</label>
          <input
            value={beds}
            onChange={(e) => setBeds(e.target.value)}
            placeholder="3"
            inputMode="numeric"
          />
        </span>
        <span>
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="them@example.com"
          />
        </span>
      </div>
      <div
        className="af-field af-field-row"
        style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
      >
        <span>
          <label>Areas they want</label>
          <input
            value={cities}
            onChange={(e) => setCities(e.target.value)}
            placeholder="Menifee, Winchester"
          />
        </span>
        <span>
          <label>Timeline</label>
          <input
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            placeholder="Before the school year"
          />
        </span>
        <span>
          <label>Came from</label>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Open house sign-in"
          />
        </span>
      </div>
      {kind === "seller" && listings.length > 0 && (
        <div className="af-field">
          <label>Their listing</label>
          <select
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
          >
            <option value="">Not on the board yet</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.address}, {l.city}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="af-field">
        <label>What she knows about them</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Nervous about the down payment. Wants a yard for the dog."
        />
      </div>
      {err && <span className="af-hint tiny err">{err}</span>}
      <button
        className="af-opbtn solid"
        type="button"
        disabled={saving}
        onClick={submit}
      >
        {saving ? "Filing…" : "Add to the book"}
      </button>
    </div>
  );
}

function ClientCard({
  client,
  documents,
  onChanged,
}: {
  client: Client;
  documents: Document[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [touch, setTouch] = useState("");
  const [snooze, setSnooze] = useState("7");
  const [editing, setEditing] = useState(false);
  const d = dueIn(client.nextFollowUp);
  const stageIdx = CLIENT_STAGES.findIndex((s) => s.id === client.stage);
  const guide = documents.find((x) => x.id === client.guideDocumentId);
  const followUp = documents.find((x) => x.id === client.followUpDocumentId);

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
      onChanged();
    }
  }

  return (
    <article className="af-client" id={`client-${client.id}`}>
      <div className="head">
        <div>
          <h3>{client.name}</h3>
          <div className="sub">
            {CLIENT_KINDS.find((k) => k.id === client.kind)?.label}
            {client.phone ? ` · ${client.phone}` : ""}
            {client.email ? ` · ${client.email}` : ""}
            {client.source ? ` · from ${client.source}` : ""}
          </div>
        </div>
        <span className={`af-due ${d.tone}`}>{d.label}</span>
        <button
          className="af-x"
          type="button"
          aria-label={`Remove ${client.name}`}
          disabled={busy !== null}
          onClick={() => {
            if (!window.confirm(`Remove ${client.name} from the book?`)) return;
            act("del", () => deleteClient({ data: { id: client.id } }));
          }}
        >
          ✕
        </button>
      </div>

      <div className="crit">
        {(client.budgetMin || client.budgetMax) && (
          <span>
            {money(client.budgetMin)}
            {client.budgetMin && client.budgetMax ? " – " : ""}
            {money(client.budgetMax)}
          </span>
        )}
        {client.beds ? <span>{client.beds}+ beds</span> : null}
        {client.cities?.length ? <span>{client.cities.join(", ")}</span> : null}
        {client.timeline && <span>{client.timeline}</span>}
        <span className={client.preapproved ? "ok" : "warn"}>
          {client.preapproved ? "Preapproved" : "Not preapproved yet"}
        </span>
      </div>

      {client.notes && <p className="notes">{client.notes}</p>}

      <div className="af-stage" aria-label={`Step: ${CLIENT_STAGES[stageIdx]?.label}`}>
        {CLIENT_STAGES.map((s, i) => (
          <span
            key={s.id}
            className={`step ${stageIdx >= i ? "on" : ""}`}
            title={s.label}
          />
        ))}
        <select
          className="af-stagepick"
          value={client.stage}
          disabled={busy !== null}
          onChange={(e) =>
            act("stage", () =>
              setClientStage({
                data: {
                  id: client.id,
                  stage: e.target.value as ClientStage,
                },
              }),
            )
          }
        >
          {CLIENT_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {client.savedHomes?.length > 0 && (
        <div className="af-savedhomes">
          <div className="af-group-label">
            Homes saved for them
            <span className="line" />
          </div>
          {client.savedHomes.map((h) => (
            <div className="row" key={h.id}>
              <b>${h.price.toLocaleString("en-US")}</b>
              <span>
                {h.address}, {h.city}
                {h.beds ? ` · ${h.beds} bd` : ""}
                {h.sqft ? ` · ${h.sqft.toLocaleString("en-US")} sqft` : ""}
              </span>
              {h.url && (
                <a href={h.url} target="_blank" rel="noreferrer noopener">
                  View ↗
                </a>
              )}
              <button
                className="af-x"
                type="button"
                aria-label="Remove saved home"
                onClick={() =>
                  act("home", () =>
                    removeSavedHome({
                      data: { clientId: client.id, homeId: h.id },
                    }),
                  )
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="af-touchbar">
        <input
          value={touch}
          onChange={(e) => setTouch(e.target.value)}
          placeholder="Log a call or text — what was said"
          aria-label={`Log a touch for ${client.name}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" && touch.trim())
              act("touch", async () => {
                await logClientTouch({
                  data: {
                    id: client.id,
                    note: touch.trim(),
                    snoozeDays: Number(snooze) || 7,
                  },
                });
                setTouch("");
              });
          }}
        />
        <select
          value={snooze}
          onChange={(e) => setSnooze(e.target.value)}
          aria-label="Next follow-up in"
        >
          <option value="1">Call back tomorrow</option>
          <option value="3">In 3 days</option>
          <option value="7">Next week</option>
          <option value="14">In 2 weeks</option>
          <option value="30">In a month</option>
          <option value="90">In 3 months</option>
        </select>
        <button
          className="af-opbtn"
          type="button"
          disabled={busy !== null || !touch.trim()}
          onClick={() =>
            act("touch", async () => {
              await logClientTouch({
                data: {
                  id: client.id,
                  note: touch.trim(),
                  snoozeDays: Number(snooze) || 7,
                },
              });
              setTouch("");
            })
          }
        >
          {busy === "touch" ? "Logging…" : "Log it"}
        </button>
      </div>

      <div className="acts">
        <button
          className="af-walk"
          type="button"
          disabled={busy !== null}
          onClick={() =>
            act("follow", () => draftClientFollowUp({ data: { id: client.id } }))
          }
        >
          <i aria-hidden="true" />
          {busy === "follow" ? (
            <>
              Writing<span className="af-blink">…</span>
            </>
          ) : (
            "Draft the follow-up"
          )}
        </button>
        {(client.kind === "first-time" || client.kind === "buyer") && (
          <button
            className="af-opbtn solid"
            type="button"
            disabled={busy !== null}
            onClick={() =>
              act("guide", () => generateBuyerGuide({ data: { id: client.id } }))
            }
          >
            {busy === "guide"
              ? "Writing…"
              : guide
                ? "Refresh their buyer guide"
                : "Write their buyer guide"}
          </button>
        )}
        {guide && (
          <Link
            className="af-opbtn"
            to="/docs/$docId"
            params={{ docId: guide.id }}
          >
            Buyer guide →
          </Link>
        )}
        {followUp && (
          <Link
            className="af-opbtn"
            to="/docs/$docId"
            params={{ docId: followUp.id }}
          >
            Follow-up script →
          </Link>
        )}
        <button
          className="af-opbtn"
          type="button"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {editing && (
        <EditClient client={client} onDone={() => { setEditing(false); onChanged(); }} />
      )}

      {client.touches?.length > 0 && (
        <div className="af-touchlog">
          {client.touches.slice(0, 4).map((t) => (
            <div key={t.id}>
              <span className="when">{timeAgo(t.at)}</span>
              {t.note}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function EditClient({
  client,
  onDone,
}: {
  client: Client;
  onDone: () => void;
}) {
  const [budgetMin, setBudgetMin] = useState(String(client.budgetMin ?? ""));
  const [budgetMax, setBudgetMax] = useState(String(client.budgetMax ?? ""));
  const [cities, setCities] = useState((client.cities ?? []).join(", "));
  const [beds, setBeds] = useState(String(client.beds ?? ""));
  const [lender, setLender] = useState(client.lender ?? "");
  const [preapproved, setPreapproved] = useState(!!client.preapproved);
  const [notes, setNotes] = useState(client.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateClient({
        data: {
          id: client.id,
          budgetMin: parsePrice(budgetMin) || undefined,
          budgetMax: parsePrice(budgetMax) || undefined,
          cities: cities
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          beds: Number(beds) || undefined,
          lender,
          preapproved,
          notes,
        },
      });
    } finally {
      setSaving(false);
      onDone();
    }
  }

  return (
    <div className="af-editclient">
      <div
        className="af-field af-field-row"
        style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}
      >
        <span>
          <label>Budget from</label>
          <input value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
        </span>
        <span>
          <label>Budget to</label>
          <input value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
        </span>
        <span>
          <label>Beds</label>
          <input value={beds} onChange={(e) => setBeds(e.target.value)} />
        </span>
        <span>
          <label>Areas</label>
          <input value={cities} onChange={(e) => setCities(e.target.value)} />
        </span>
      </div>
      <div
        className="af-field af-field-row"
        style={{ gridTemplateColumns: "2fr 1fr" }}
      >
        <span>
          <label>Lender / preapproval note</label>
          <input value={lender} onChange={(e) => setLender(e.target.value)} />
        </span>
        <span>
          <label>Preapproved</label>
          <button
            type="button"
            className={`af-switch mini ${preapproved ? "on" : ""}`}
            aria-pressed={preapproved}
            aria-label="Preapproved"
            onClick={() => setPreapproved((v) => !v)}
          />
        </span>
      </div>
      <div className="af-field">
        <label>Notes</label>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <button
        className="af-opbtn solid"
        type="button"
        disabled={saving}
        onClick={save}
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
