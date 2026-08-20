import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import {
  generateListingPresentation,
  generatePoster,
} from "../../lib/agentforge/functions";
import type { Document, Listing, Owner } from "../../lib/agentforge/types";
import { CLIENT_STAGES } from "../../lib/agentforge/types";

export interface PlanData {
  owner: Owner;
  listings: Listing[];
  documents: Document[];
}

// Every tool from her listing presentation, with an honest note on what the
// desk already does for real and what is waiting on an account.
const TOOLS: {
  name: string;
  what: string;
  state: "live" | "ready" | "manual";
  where?: "studio" | "desk" | "plan";
}[] = [
  {
    name: "Just Listed marketing",
    what: "Poster, social set and the walkthrough go out the day the sign lands.",
    state: "live",
    where: "studio",
  },
  {
    name: "Single property website",
    what: "Every listing gets its own public page with photos, video and a lead form.",
    state: "live",
    where: "plan",
  },
  {
    name: "Listing landing page",
    what: "The same page doubles as the link in every ad and bio.",
    state: "live",
    where: "plan",
  },
  {
    name: "Cinematic video walkthrough",
    what: "90 to 150 second tour written from her real photos of the home.",
    state: "live",
    where: "studio",
  },
  {
    name: "Virtual tour",
    what: "The walkthrough video doubles as the tour on every portal.",
    state: "live",
    where: "studio",
  },
  {
    name: "Print flyers",
    what: "Branded one-page flyer with the house photo, print or save as PDF.",
    state: "live",
    where: "studio",
  },
  {
    name: "eFlyer campaign",
    what: "The same flyer as an email drop to her sphere.",
    state: "ready",
    where: "studio",
  },
  {
    name: "Facebook campaign",
    what: "Copy and creative drafted here; posts once Facebook is connected.",
    state: "ready",
    where: "studio",
  },
  {
    name: "Instagram + TikTok",
    what: "Vertical script, caption and hashtags per listing.",
    state: "ready",
    where: "studio",
  },
  {
    name: "YouTube Shorts",
    what: "The walkthrough cutdown, captioned and ready to upload.",
    state: "ready",
    where: "studio",
  },
  {
    name: "Text-for-info line",
    what: "Buyers text the sign, she gets the lead. Needs her Twilio number.",
    state: "ready",
    where: "studio",
  },
  {
    name: "Open house marketing",
    what: "Open house poster, invite copy and the follow-up sequence.",
    state: "live",
    where: "studio",
  },
  {
    name: "Blog post",
    what: "Long-form neighborhood piece written per listing.",
    state: "ready",
    where: "studio",
  },
  {
    name: "Craigslist / marketplace",
    what: "Copy formatted for a marketplace post; she pastes it in.",
    state: "manual",
  },
  {
    name: "Just Sold marketing",
    what: "The closing post and poster that farm the whole street.",
    state: "live",
    where: "studio",
  },
];

const STATE_LABEL: Record<string, string> = {
  live: "Live on the desk",
  ready: "Drafted here · connect to post",
  manual: "Copy ready · post by hand",
};

export function MarketingPlan(props: PlanData) {
  const router = useRouter();
  const [listingId, setListingId] = useState(props.listings[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const presentations = props.documents.filter(
    (d) => d.kind === "presentation",
  );

  async function makePresentation() {
    setBusy("pres");
    try {
      await generateListingPresentation({
        data: { listingId: listingId || undefined },
      });
      router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  async function makeJustListed() {
    if (!listingId) return;
    setBusy("poster");
    try {
      await generatePoster({ data: { listingId, kind: "just-listed" } });
      router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  const listing = props.listings.find((l) => l.id === listingId);

  return (
    <>
      <div className="af-doc-head">
        <div className="rule">Her marketing plan</div>
        <h2>Property marketing that generates buyer leads.</h2>
        <p className="af-hint">
          What a seller sees at the kitchen table, and what the desk actually
          runs the week the sign goes in the yard.
        </p>
      </div>

      <section className="af-section af-presentation">
        <header>
          <h2>Win the listing</h2>
          <span className="count">{presentations.length} filed</span>
        </header>
        <div className="af-field af-field-row" style={{ gridTemplateColumns: "2fr 1fr" }}>
          <span>
            <label>For the appointment at</label>
            <select
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
            >
              <option value="">A general template</option>
              {props.listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.address}, {l.city}
                </option>
              ))}
            </select>
          </span>
          <span>
            <label>Also make</label>
            <button
              className="af-opbtn"
              type="button"
              disabled={!listingId || busy !== null}
              onClick={makeJustListed}
            >
              {busy === "poster" ? "Designing…" : "Just Listed poster"}
            </button>
          </span>
        </div>
        <button
          className="af-walk"
          type="button"
          disabled={busy !== null}
          onClick={makePresentation}
        >
          <i aria-hidden="true" />
          {busy === "pres" ? (
            <>
              Writing<span className="af-blink">…</span>
            </>
          ) : (
            "Write the listing presentation"
          )}
        </button>
        <span className="af-hint tiny">
          Pricing strategy, the full marketing plan, week-by-week timeline and
          the close — ready to print.
        </span>
        {presentations.length > 0 && (
          <div className="af-posterlist">
            {presentations.slice(0, 4).map((p) => (
              <div className="af-posterrow" key={p.id}>
                <Link to="/docs/$docId" params={{ docId: p.id }}>
                  <b>{p.title}</b>
                  <span>listing presentation</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="af-section">
        <header>
          <h2>Every tool, on every listing</h2>
          <span className="count">
            {TOOLS.filter((t) => t.state === "live").length} live now
          </span>
        </header>
        <div className="af-toolgrid">
          {TOOLS.map((t) => (
            <div className={`af-tool ${t.state}`} key={t.name}>
              <b>{t.name}</b>
              <p>{t.what}</p>
              <span className="state">{STATE_LABEL[t.state]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="af-section">
        <header>
          <h2>Her property pages</h2>
          <span className="count">one per listing</span>
        </header>
        <p className="af-hint">
          The link she puts in every ad, every bio and every text. Photos, the
          walkthrough, and a form that drops a lead straight into her book — she
          gets the text before they close the tab.
        </p>
        <div className="af-proppages">
          {props.listings.map((l) => (
            <Link
              key={l.id}
              className="af-proppage"
              to="/home/$listingId"
              params={{ listingId: l.id }}
            >
              {l.photoUrl ? (
                <img src={l.photoUrl} alt="" />
              ) : (
                <span className="ph" aria-hidden="true" />
              )}
              <span className="meta">
                <b>{l.address}</b>
                <i>
                  {l.city} · ${l.price.toLocaleString("en-US")}
                </i>
              </span>
              <span className="go">Open page →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="af-section af-weeks">
        <header>
          <h2>What the seller sees</h2>
        </header>
        <div className="af-weekgrid">
          <div>
            <b>Week one</b>
            <p>
              Photos and the walkthrough filmed. Property page live. Just Listed
              poster, social set across four channels, sign with the text line,
              neighbor invites out.
            </p>
          </div>
          <div>
            <b>Week two</b>
            <p>
              Open house marketing, the buyer follow-up sequence running, first
              showing feedback back to the seller, ads iterating on what people
              clicked.
            </p>
          </div>
          <div>
            <b>Week three</b>
            <p>
              Price and position check against live market numbers, a second
              creative angle, and the sphere email drop.
            </p>
          </div>
        </div>
      </section>

      <section className="af-section af-process">
        <header>
          <h2>And for her buyers</h2>
          <span className="count">the purchasing process</span>
        </header>
        <p className="af-hint">
          The same steps she hands a first-time buyer. Track anyone on it from{" "}
          <Link to="/clients">Clients &amp; buyers</Link>.
        </p>
        <ol className="af-processrow">
          {CLIENT_STAGES.map((s, i) => (
            <li key={s.id}>
              <span className="n">{i + 1}</span>
              <b>{s.label}</b>
              <i>{s.note}</i>
            </li>
          ))}
        </ol>
      </section>

      {listing && (
        <p className="af-hint">
          Ready to market {listing.address}?{" "}
          <Link to="/studio">Open the studio →</Link>
        </p>
      )}
    </>
  );
}
