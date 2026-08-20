import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import {
  addLead,
  connectChannel,
  createCampaign,
  createListing,
  deleteCampaign,
  deleteLead,
  deletePoster,
  draftFollowUp,
  generatePoster,
  generateWalkthrough,
  removeTeamMember,
  sendTestSms,
  setLeadStage,
  setNotifyPrefs,
  setPieceStatus,
  setTwilio,
} from "../../lib/agentforge/functions";
import type {
  Campaign,
  Channel,
  ChannelId,
  Document,
  LeadContact,
  LeadStage,
  Listing,
  NotifyEvent,
  Owner,
  Poster,
  SmsMessage,
  TeamMember,
} from "../../lib/agentforge/types";
import {
  CHANNELS,
  LEAD_STAGES,
  NOTIFY_EVENTS,
} from "../../lib/agentforge/types";
import { parsePrice } from "../../lib/agentforge/price";
import { PhotoStrip } from "./Dashboard";
import { timeAgo } from "./Shell";

interface NotifyState {
  phone: string;
  prefs: NotifyEvent[];
  twilioConnected: boolean;
  twilioFrom: string;
}

export interface StudioData {
  owner: Owner;
  listings: Listing[];
  channels: Channel[];
  campaigns: Campaign[];
  leads: LeadContact[];
  posters: Poster[];
  team: TeamMember[];
  messages: SmsMessage[];
  notify: NotifyState;
  documents: Document[];
}

export function Studio(props: StudioData) {
  const router = useRouter();
  const refresh = () => router.invalidate();
  return (
    <>
      <div className="af-doc-head">
        <div className="rule">Marketing studio</div>
        <h2>Make the noise, catch the leads.</h2>
      </div>
      <ChannelStrip channels={props.channels} onChanged={refresh} />
      <div className="af-studio-grid">
        <div>
          <WalkthroughStudio listings={props.listings} onChanged={refresh} />
          <Composer listings={props.listings} onChanged={refresh} />
          <PosterMaker
            listings={props.listings}
            posters={props.posters}
            onChanged={refresh}
          />
          <CampaignList
            campaigns={props.campaigns}
            listings={props.listings}
            onChanged={refresh}
          />
        </div>
        <div>
          <NotificationsPanel
            notify={props.notify}
            messages={props.messages}
            onChanged={refresh}
          />
          <LeadBook
            leads={props.leads}
            listings={props.listings}
            team={props.team}
            onChanged={refresh}
          />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications: agents text Leslie updates                           */

function NotificationsPanel({
  notify,
  messages,
  onChanged,
}: {
  notify: NotifyState;
  messages: SmsMessage[];
  onChanged: () => void;
}) {
  const [phone, setPhone] = useState(notify.phone);
  const [prefs, setPrefs] = useState<NotifyEvent[]>(notify.prefs);
  const [busy, setBusy] = useState<string | null>(null);
  const [showTwilio, setShowTwilio] = useState(false);

  async function savePrefs(next: NotifyEvent[], nextPhone = phone) {
    setBusy("prefs");
    try {
      await setNotifyPrefs({ data: { phone: nextPhone, prefs: next } });
    } finally {
      setBusy(null);
      onChanged();
    }
  }
  function toggle(id: NotifyEvent) {
    const next = prefs.includes(id)
      ? prefs.filter((x) => x !== id)
      : [...prefs, id];
    setPrefs(next);
    savePrefs(next);
  }
  async function test() {
    setBusy("test");
    try {
      await setNotifyPrefs({ data: { phone } });
      await sendTestSms();
    } finally {
      setBusy(null);
      onChanged();
    }
  }

  return (
    <section className="af-section">
      <header>
        <h2>Updates by text</h2>
        <span className={`af-chip ${notify.twilioConnected ? "live" : ""}`}>
          {notify.twilioConnected ? "texting live" : "log only"}
        </span>
      </header>
      <div className="af-field">
        <label>Your mobile number</label>
        <div className="af-import">
          <input
            className="af-opinput"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="951-555-0123"
            aria-label="Your mobile number"
          />
          <button
            className="af-opbtn"
            type="button"
            disabled={busy !== null}
            onClick={() => savePrefs(prefs, phone)}
          >
            Save
          </button>
        </div>
      </div>
      <div className="af-field">
        <label>Text me when</label>
        <div className="af-checks">
          {NOTIFY_EVENTS.map((e) => (
            <button
              key={e.id}
              type="button"
              className={`af-check ${prefs.includes(e.id) ? "on" : ""}`}
              aria-pressed={prefs.includes(e.id)}
              disabled={busy !== null}
              onClick={() => toggle(e.id)}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>
      <div className="af-import">
        <button
          className="af-opbtn solid"
          type="button"
          disabled={busy !== null || phone.trim().length < 7}
          onClick={test}
        >
          {busy === "test" ? "Sending…" : "Send me a test text"}
        </button>
        <button
          className="af-opbtn"
          type="button"
          onClick={() => setShowTwilio((v) => !v)}
        >
          {notify.twilioConnected ? "Twilio ✓" : "Connect Twilio"}
        </button>
      </div>

      {showTwilio && (
        <TwilioForm
          connected={notify.twilioConnected}
          from={notify.twilioFrom}
          onDone={() => {
            setShowTwilio(false);
            onChanged();
          }}
        />
      )}

      {messages.length > 0 && (
        <div className="af-msglog">
          <div className="af-group-label">
            Recent texts
            <span className="line" />
          </div>
          {messages.slice(0, 5).map((m) => (
            <div className={`af-msg ${m.status}`} key={m.id}>
              <div className="top">
                <span className="st">{m.status}</span>
                <span className="when">{timeAgo(m.createdAt)}</span>
              </div>
              <p>{m.body}</p>
              {m.detail && <span className="detail">{m.detail}</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TwilioForm({
  connected,
  from,
  onDone,
}: {
  connected: boolean;
  from: string;
  onDone: () => void;
}) {
  const [sid, setSid] = useState("");
  const [token, setToken] = useState("");
  const [fromNum, setFromNum] = useState(from);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await setTwilio({ data: { sid, token, from: fromNum } });
    } finally {
      setSaving(false);
      onDone();
    }
  }
  async function clear() {
    setSaving(true);
    try {
      await setTwilio({ data: { clear: true } });
    } finally {
      setSaving(false);
      onDone();
    }
  }

  return (
    <div className="af-twilio">
      <p className="note">
        Paste your Twilio Account SID, Auth Token, and a Twilio phone number.
        Real texts go out once all three are saved. Stored server-side, shown
        masked.
      </p>
      <div className="af-field">
        <label>Account SID</label>
        <input
          className="af-opinput"
          value={sid}
          onChange={(e) => setSid(e.target.value)}
          placeholder="AC…"
        />
      </div>
      <div className="af-field">
        <label>Auth Token</label>
        <input
          className="af-opinput"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="your auth token"
        />
      </div>
      <div className="af-field">
        <label>From number</label>
        <input
          className="af-opinput"
          value={fromNum}
          onChange={(e) => setFromNum(e.target.value)}
          placeholder="+19515550100"
        />
      </div>
      <div className="af-import">
        <button
          className="af-opbtn solid"
          type="button"
          disabled={saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save Twilio"}
        </button>
        {connected && (
          <button
            className="af-opbtn ghost"
            type="button"
            disabled={saving}
            onClick={clear}
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Walkthrough studio: pick or upload the property, add her real       */
/* photos, and generate the video walkthrough right here.              */

function WalkthroughStudio({
  listings,
  onChanged,
}: {
  listings: Listing[];
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<"pick" | "add">(
    listings.length > 0 ? "pick" : "add",
  );
  const [listingId, setListingId] = useState(listings[0]?.id ?? "");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [addr, setAddr] = useState("");
  const [city, setCity] = useState("Temecula");
  const [price, setPrice] = useState("");
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");

  // A just-created (or just-deleted) listingId may not be in the props yet
  // while the router refetches. Never silently fall back to another house —
  // hold the panel until the refresh lands or she picks one herself.
  const found = listings.find((l) => l.id === listingId);
  const listing = found ?? (listingId === "" ? listings[0] : undefined);
  const waiting = listingId !== "" && !found;

  async function addProperty() {
    if (adding) return;
    const p = parsePrice(price);
    if (!addr.trim() || !city.trim() || !(p > 0)) {
      setAddErr(
        "Give it an address, a city, and a price — then it can go up.",
      );
      return;
    }
    setAddErr("");
    setAdding(true);
    try {
      const res = await createListing({
        data: { address: addr.trim(), city: city.trim(), price: p },
      });
      if (res?.listing?.id) {
        setListingId(res.listing.id);
        setMode("pick");
        setAddr("");
        setPrice("");
      }
    } finally {
      setAdding(false);
      onChanged();
    }
  }

  async function generate() {
    if (!listing || waiting || genBusy) return;
    setGenBusy(true);
    try {
      await generateWalkthrough({ data: { id: listing.id } });
    } finally {
      setGenBusy(false);
      onChanged();
    }
  }

  const photoCount = listing?.photos?.length ?? 0;

  return (
    <section className="af-section af-walkstudio">
      <header>
        <h2>Walkthrough studio</h2>
        <span className="count">from her real house</span>
      </header>
      <p className="af-hint">
        Pick the property — or upload a new one — drop in her real photos, and
        the desk writes the 90–150 second walkthrough, ready to film and post.
      </p>
      <div className="af-tabs" role="tablist" aria-label="Property source">
        <button
          type="button"
          className={mode === "pick" ? "on" : ""}
          onClick={() => setMode("pick")}
        >
          Her listings
        </button>
        <button
          type="button"
          className={mode === "add" ? "on" : ""}
          onClick={() => setMode("add")}
        >
          + Upload a new property
        </button>
      </div>

      {mode === "add" ? (
        <>
          <div
            className="af-field af-field-row"
            style={{ gridTemplateColumns: "2fr 1fr 1fr" }}
          >
            <span>
              <label>Address</label>
              <input
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                placeholder="31640 Calle Novelda"
              />
            </span>
            <span>
              <label>City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Temecula"
              />
            </span>
            <span>
              <label>Price</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="685000"
                inputMode="numeric"
              />
            </span>
          </div>
          <button
            className="af-opbtn solid"
            type="button"
            disabled={adding}
            onClick={addProperty}
          >
            {adding ? "Staging…" : "Add the property"}
          </button>
          {addErr && <span className="af-hint tiny err">{addErr}</span>}
          <span className="af-hint tiny">
            It lands on the board and the map as coming soon — then add her
            photos and generate.
          </span>
        </>
      ) : listing || waiting ? (
        <>
          <div className="af-field">
            <label>Property</label>
            <select
              value={waiting ? "" : listing!.id}
              onChange={(e) => setListingId(e.target.value)}
            >
              {waiting && <option value="">Staging the new property…</option>}
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.address}, {l.city}
                  {l.price > 0 ? ` · $${l.price.toLocaleString("en-US")}` : ""}
                </option>
              ))}
            </select>
          </div>
          {!waiting && listing && (
            <PhotoStrip
              listing={listing}
              busyId={busyId}
              onBusy={setBusyId}
              onChanged={onChanged}
            />
          )}
          <div className="af-walkacts">
            <button
              className="af-walk"
              type="button"
              disabled={genBusy || busyId !== null || waiting || !listing}
              onClick={generate}
            >
              <i aria-hidden="true" />
              {genBusy ? (
                <>
                  Writing<span className="af-blink">…</span>
                </>
              ) : waiting ? (
                "Staging…"
              ) : listing?.walkthroughDocumentId ? (
                "Regenerate the walkthrough"
              ) : (
                "Generate the walkthrough"
              )}
            </button>
            {!waiting && listing?.walkthroughDocumentId && (
              <Link
                className="af-opbtn"
                to="/docs/$docId"
                params={{ docId: listing.walkthroughDocumentId }}
              >
                View the script →
              </Link>
            )}
          </div>
          <span className="af-hint tiny">
            {waiting
              ? "Filing the new property — one beat."
              : photoCount > 0
                ? `Written around her ${photoCount} real photo${photoCount === 1 ? "" : "s"} of this house.`
                : "Add her real photos above so the walkthrough is written for the actual house."}
          </span>
        </>
      ) : (
        <p className="af-hint">
          No listings yet — switch to “Upload a new property” to stage her
          first one.
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Poster / flyer maker                                                */

function PosterMaker({
  listings,
  posters,
  onChanged,
}: {
  listings: Listing[];
  posters: Poster[];
  onChanged: () => void;
}) {
  const marketable = listings.filter((l) => l.status !== "sold");
  const [listingId, setListingId] = useState(marketable[0]?.id ?? "");
  const [kind, setKind] = useState("just-listed");
  const [busy, setBusy] = useState(false);

  async function make() {
    if (busy) return;
    setBusy(true);
    try {
      await generatePoster({
        data: {
          listingId: kind === "did-you-know" ? undefined : listingId || undefined,
          kind: kind as
            | "just-listed"
            | "open-house"
            | "did-you-know"
            | "just-sold",
        },
      });
    } finally {
      setBusy(false);
      onChanged();
    }
  }

  return (
    <section className="af-section">
      <header>
        <h2>Poster maker</h2>
        <span className="count">{posters.length} made</span>
      </header>
      <div className="af-field af-field-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <span>
          <label>Type</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="just-listed">Just Listed</option>
            <option value="open-house">Open House</option>
            <option value="did-you-know">Did You Know</option>
            <option value="just-sold">Just Sold</option>
          </select>
        </span>
        <span>
          <label>Listing</label>
          <select
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            disabled={kind === "did-you-know"}
          >
            {marketable.map((l) => (
              <option key={l.id} value={l.id}>
                {l.address}
              </option>
            ))}
            {listings
              .filter((l) => l.status === "sold")
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.address} (sold)
                </option>
              ))}
          </select>
        </span>
      </div>
      <button
        className="af-walk"
        type="button"
        disabled={busy}
        onClick={make}
      >
        <i aria-hidden="true" />
        {busy ? (
          <>
            Designing<span className="af-blink">…</span>
          </>
        ) : (
          "Make poster"
        )}
      </button>

      {posters.length > 0 && (
        <div className="af-posterlist">
          {posters.slice(0, 5).map((p) => {
            const listing = listings.find((l) => l.id === p.listingId);
            return (
              <div className="af-posterrow" key={p.id}>
                {listing?.photoUrl && (
                  <img className="thumb" src={listing.photoUrl} alt="" />
                )}
                <Link to="/poster/$posterId" params={{ posterId: p.id }}>
                  <b>{p.headline}</b>
                  <span>
                    {p.kind.replace("-", " ")}
                    {listing ? ` · ${listing.address}` : ""} ·{" "}
                    {timeAgo(p.createdAt)}
                  </span>
                </Link>
                <button
                  className="af-x"
                  type="button"
                  aria-label="Delete poster"
                  onClick={async () => {
                    if (!window.confirm("Delete this poster?")) return;
                    await deletePoster({ data: { id: p.id } });
                    onChanged();
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Channels: TikTok / Instagram / Facebook / LinkedIn / YouTube        */

function ChannelStrip({
  channels,
  onChanged,
}: {
  channels: Channel[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(id: ChannelId) {
    setBusy(id);
    try {
      await connectChannel({ data: { id } });
    } finally {
      setBusy(null);
      onChanged();
    }
  }

  return (
    <section className="af-channels" aria-label="Your channels">
      {channels.map((ch) => {
        const label = CHANNELS.find((c) => c.id === ch.id)?.label ?? ch.id;
        return (
          <div className={`af-channel ${ch.connected ? "on" : ""}`} key={ch.id}>
            <div>
              <b>{label}</b>
              <span className="handle">{ch.handle}</span>
            </div>
            <button
              className={`af-switch mini ${ch.connected ? "on" : ""}`}
              type="button"
              aria-pressed={ch.connected}
              aria-label={`${ch.connected ? "Disconnect" : "Connect"} ${label}`}
              disabled={busy !== null}
              onClick={() => toggle(ch.id)}
            />
          </div>
        );
      })}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Composer: pick the listing, pick the channels, add her take         */

function Composer({
  listings,
  onChanged,
}: {
  listings: Listing[];
  onChanged: () => void;
}) {
  const marketable = listings.filter((l) => l.status !== "sold");
  const [listingId, setListingId] = useState(marketable[0]?.id ?? "");
  const [selected, setSelected] = useState<ChannelId[]>([
    "tiktok",
    "instagram",
    "facebook",
  ]);
  const [take, setTake] = useState("");
  const [working, setWorking] = useState(false);

  function toggleChannel(id: ChannelId) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function generate() {
    if (!listingId || selected.length === 0 || working) return;
    setWorking(true);
    try {
      await createCampaign({
        data: { listingId, channels: selected, ownerTake: take },
      });
      setTake("");
    } finally {
      setWorking(false);
      onChanged();
    }
  }

  return (
    <section className="af-section af-composer">
      <header>
        <h2>New campaign</h2>
        <span className="count">ads + posts per channel</span>
      </header>
      <div className="af-field">
        <label>Listing</label>
        <select value={listingId} onChange={(e) => setListingId(e.target.value)}>
          {marketable.map((l) => (
            <option key={l.id} value={l.id}>
              {l.address}, {l.city} · ${l.price.toLocaleString("en-US")}
            </option>
          ))}
        </select>
      </div>
      <div className="af-field">
        <label>Channels</label>
        <div className="af-checks">
          {CHANNELS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`af-check ${selected.includes(c.id) ? "on" : ""}`}
              onClick={() => toggleChannel(c.id)}
              aria-pressed={selected.includes(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="af-field">
        <label>Your take on the house (the desk writes in your voice)</label>
        <textarea
          rows={3}
          value={take}
          onChange={(e) => setTake(e.target.value)}
          placeholder="What would you say about this house at the open house door?"
        />
      </div>
      <button
        className="af-walk"
        type="button"
        disabled={working || !listingId || selected.length === 0}
        onClick={generate}
      >
        <i aria-hidden="true" />
        {working ? (
          <>
            Writing creatives<span className="af-blink">…</span>
          </>
        ) : (
          "Generate campaign"
        )}
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Campaigns: per-channel pieces with approve / posted flow            */

function CampaignList({
  campaigns,
  listings,
  onChanged,
}: {
  campaigns: Campaign[];
  listings: Listing[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function mark(
    campaignId: string,
    pieceId: string,
    status: "approved" | "posted",
  ) {
    setBusy(pieceId);
    try {
      await setPieceStatus({ data: { campaignId, pieceId, status } });
    } finally {
      setBusy(null);
      onChanged();
    }
  }

  return (
    <section className="af-section">
      <header>
        <h2>Campaigns</h2>
        <span className="count">{campaigns.length} drafted</span>
      </header>
      {campaigns.length === 0 && (
        <p className="af-empty">
          No campaigns yet. Pick a listing above, add your take, and generate.
        </p>
      )}
      {campaigns.map((cmp) => {
        const listing = listings.find((l) => l.id === cmp.listingId);
        return (
          <article className="af-campaign" key={cmp.id}>
            <div className="head">
              <button
                className="af-x corner"
                type="button"
                aria-label="Delete campaign"
                disabled={busy !== null}
                onClick={async () => {
                  if (!window.confirm("Delete this campaign?")) return;
                  await deleteCampaign({ data: { id: cmp.id } });
                  onChanged();
                }}
              >
                ✕
              </button>
              <div>
                <h3>{listing?.address ?? "Listing"}</h3>
                <div className="sub">
                  {timeAgo(cmp.createdAt)}
                  {cmp.documentId && (
                    <>
                      {" · "}
                      <Link
                        to="/docs/$docId"
                        params={{ docId: cmp.documentId }}
                      >
                        full campaign doc
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
            {cmp.ownerTake && <p className="take">"{cmp.ownerTake}"</p>}
            <div className="pieces">
              {cmp.pieces.map((p) => {
                const label =
                  CHANNELS.find((c) => c.id === p.channel)?.label ?? p.channel;
                return (
                  <div className={`af-piece ${p.status}`} key={p.id}>
                    <div className="bar">
                      <span className="ch">{label}</span>
                      <span className={`st ${p.status}`}>{p.status}</span>
                    </div>
                    <p className="body">{p.content.slice(0, 420)}</p>
                    <div className="acts">
                      {p.status === "draft" && (
                        <button
                          className="af-opbtn"
                          type="button"
                          disabled={busy !== null}
                          onClick={() => mark(cmp.id, p.id, "approved")}
                        >
                          {busy === p.id ? "Saving…" : "Approve"}
                        </button>
                      )}
                      {p.status === "approved" && (
                        <button
                          className="af-opbtn solid"
                          type="button"
                          disabled={busy !== null}
                          onClick={() => mark(cmp.id, p.id, "posted")}
                        >
                          {busy === p.id ? "Posting…" : "Mark posted"}
                        </button>
                      )}
                      {p.status === "posted" && p.postedAt && (
                        <span className="when">
                          posted {timeAgo(p.postedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Lead book: everyone in one place                                    */

function LeadBook({
  leads,
  listings,
  team,
  onChanged,
}: {
  leads: LeadContact[];
  listings: Listing[];
  team: TeamMember[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  async function advance(lead: LeadContact) {
    const i = LEAD_STAGES.indexOf(lead.stage);
    if (i >= LEAD_STAGES.length - 1) return;
    setBusy(lead.id);
    try {
      await setLeadStage({
        data: { id: lead.id, stage: LEAD_STAGES[i + 1] as LeadStage },
      });
    } finally {
      setBusy(null);
      onChanged();
    }
  }

  async function followUp(id: string) {
    setBusy(id);
    try {
      await draftFollowUp({ data: { id } });
    } finally {
      setBusy(null);
      onChanged();
    }
  }

  return (
    <section className="af-section">
      <header>
        <h2>Lead book</h2>
        <span className="count">
          {leads.length} leads · {team.length} team
        </span>
      </header>
      {leads.map((lead) => {
        const listing = listings.find((l) => l.id === lead.listingId);
        return (
          <article className="af-leadcard" key={lead.id}>
            <div className="head">
              <h3>{lead.name}</h3>
              <span className={`af-chip stage-${lead.stage}`}>
                {lead.stage}
              </span>
              <button
                className="af-x"
                type="button"
                aria-label={`Remove lead: ${lead.name}`}
                disabled={busy !== null}
                onClick={async () => {
                  if (!window.confirm(`Remove ${lead.name} from the book?`))
                    return;
                  await deleteLead({ data: { id: lead.id } });
                  onChanged();
                }}
              >
                ✕
              </button>
            </div>
            <div className="sub">
              {lead.source}
              {listing ? ` · ${listing.address}` : ""}
              {lead.phone ? ` · ${lead.phone}` : ""}
              {lead.email ? ` · ${lead.email}` : ""}
            </div>
            {lead.notes && <p className="notes">{lead.notes}</p>}
            <div className="acts">
              {lead.followUpDocumentId ? (
                <Link
                  to="/docs/$docId"
                  params={{ docId: lead.followUpDocumentId }}
                  className="af-opbtn"
                >
                  Read follow-up
                </Link>
              ) : (
                <button
                  className="af-opbtn"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => followUp(lead.id)}
                >
                  {busy === lead.id ? (
                    <>
                      Drafting<span className="af-blink">…</span>
                    </>
                  ) : (
                    "Draft follow-up"
                  )}
                </button>
              )}
              {lead.stage !== "client" && (
                <button
                  className="af-advance"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => advance(lead)}
                >
                  Advance →
                </button>
              )}
            </div>
          </article>
        );
      })}
      <button className="af-slot" type="button" onClick={() => setShowNew(true)}>
        New lead
      </button>

      <div className="af-teamlist">
        <div className="af-group-label">
          Your people
          <span className="line" />
        </div>
        {team.map((m) => (
          <div className="member" key={m.id}>
            <b>{m.name}</b>
            <span>{m.role}</span>
            {team.length > 1 && (
              <button
                className="af-x"
                type="button"
                aria-label={`Remove ${m.name}`}
                onClick={async () => {
                  if (!window.confirm(`Remove ${m.name} from the team?`))
                    return;
                  await removeTeamMember({ data: { id: m.id } });
                  onChanged();
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {showNew && (
        <NewLeadModal
          listings={listings}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            onChanged();
          }}
        />
      )}
    </section>
  );
}

function NewLeadModal({
  listings,
  onClose,
  onCreated,
}: {
  listings: Listing[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [source, setSource] = useState("Open house sign-in");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [listingId, setListingId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    await addLead({
      data: {
        name,
        source,
        phone: phone || undefined,
        email: email || undefined,
        listingId: listingId || undefined,
        notes: notes || undefined,
      },
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div className="af-modal-backdrop" onClick={onClose}>
      <div className="af-modal" onClick={(e) => e.stopPropagation()}>
        <h3>New lead</h3>
        <div className="af-field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="af-field">
          <label>Source</label>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option>Open house sign-in</option>
            <option>Zillow inquiry</option>
            <option>Instagram DM</option>
            <option>Facebook ad</option>
            <option>TikTok comment</option>
            <option>LinkedIn</option>
            <option>Referral</option>
            <option>Sign call</option>
          </select>
        </div>
        <div className="af-field af-field-row">
          <span>
            <label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </span>
          <span>
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </span>
          <span>
            <label>Listing</label>
            <select
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
            >
              <option value="">General</option>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.address}
                </option>
              ))}
            </select>
          </span>
        </div>
        <div className="af-field">
          <label>Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
            {saving ? "Saving…" : "Add lead"}
          </button>
        </div>
      </div>
    </div>
  );
}
