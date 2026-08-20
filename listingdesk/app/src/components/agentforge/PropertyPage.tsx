import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { captureLead } from "../../lib/agentforge/functions";
import type { Listing, Owner } from "../../lib/agentforge/types";
import { STAGE_LABELS } from "../../lib/agentforge/types";

export function PropertyPage({
  listing,
  owner,
  videoUrl,
}: {
  listing: Listing;
  owner: Owner;
  videoUrl: string | null;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const photos = listing.photos ?? [];

  async function send() {
    if (sending) return;
    if (!name.trim() || (!phone.trim() && !email.trim())) {
      setErr("Add a name and either a phone or an email so Leslie can reply.");
      return;
    }
    setErr("");
    setSending(true);
    try {
      const res = await captureLead({
        data: {
          listingId: listing.id,
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          message: message.trim() || undefined,
        },
      });
      if (res.ok) setSent(true);
      else setErr("Something went wrong. Text Leslie at " + owner.phone + ".");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="af-propshell">
    <div className="af-prop">
      <header className="af-prophead">
        <span className={`badge ${listing.status}`}>
          {STAGE_LABELS[listing.status]}
        </span>
        <h1>{listing.address}</h1>
        <p className="loc">
          {listing.city}, California · {owner.brokerage}
        </p>
        <div className="figs">
          <span>
            <b>
              {listing.price > 0
                ? `$${listing.price.toLocaleString("en-US")}`
                : "Price on request"}
            </b>
            <i>asking</i>
          </span>
          <span>
            <b>{listing.beds}</b>
            <i>bedrooms</i>
          </span>
          <span>
            <b>{listing.baths}</b>
            <i>baths</i>
          </span>
          <span>
            <b>{listing.sqft.toLocaleString("en-US")}</b>
            <i>square feet</i>
          </span>
        </div>
      </header>

      {listing.photoUrl && (
        <div className="af-prophero">
          <img src={listing.photoUrl} alt={`${listing.address}, ${listing.city}`} />
        </div>
      )}

      {videoUrl && (
        <section className="af-propvideo">
          <h2>Walk through it</h2>
          <video src={videoUrl} controls playsInline preload="metadata" />
        </section>
      )}

      <section className="af-propbody">
        <div>
          <h2>About this home</h2>
          <p className="features">{listing.features}</p>
          {listing.notes && <p className="notes">{listing.notes}</p>}
          {photos.length > 1 && (
            <div className="af-propgallery">
              {photos.map((src, i) => (
                <img key={src} src={src} alt={`${listing.address} photo ${i + 1}`} />
              ))}
            </div>
          )}
        </div>

        <aside className="af-propform">
          <div className="who">
            <img src="/assets/leslie.webp" alt="" />
            <span>
              <b>{owner.name} Smith</b>
              <i>{owner.brokerage}</i>
              <i>{owner.dre}</i>
            </span>
          </div>
          {sent ? (
            <div className="sent">
              <b>Got it — Leslie has your message.</b>
              <p>
                She answers fast. If you need her right now, call or text{" "}
                {owner.phone}.
              </p>
            </div>
          ) : (
            <>
              <h2>Ask about this home</h2>
              <label>
                Your name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                Phone
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                />
              </label>
              <label>
                Email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  inputMode="email"
                />
              </label>
              <label>
                What would you like to know?
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Can I see it this weekend?"
                />
              </label>
              {err && <span className="err">{err}</span>}
              <button type="button" disabled={sending} onClick={send}>
                {sending ? "Sending…" : "Send it to Leslie"}
              </button>
              <span className="tiny">
                Or text {owner.phone} — she answers within minutes.
              </span>
            </>
          )}
        </aside>
      </section>

      <footer className="af-propfoot">
        <span>
          {owner.name} Smith · {owner.brokerage} · {owner.dre} · {owner.phone}
        </span>
        <Link to="/">ListingDesk</Link>
      </footer>
    </div>
    </div>
  );
}
