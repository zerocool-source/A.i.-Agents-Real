import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { getPoster } from "../lib/agentforge/functions";

export const Route = createFileRoute("/poster/$posterId")({
  loader: async ({ params }) => {
    const result = await getPoster({ data: { id: params.posterId } });
    if (!result.poster) throw notFound();
    return result;
  },
  head: () => ({ meta: [{ title: "Poster · ListingDesk" }] }),
  component: PosterPage,
});

const KIND_LABEL: Record<string, string> = {
  "just-listed": "Just Listed",
  "open-house": "Open House",
  "did-you-know": "Did You Know",
  "just-sold": "Just Sold",
};

function PosterPage() {
  const { poster, owner, listing } = Route.useLoaderData();
  if (!poster) return null;

  return (
    <div className="af-poster-shell">
      <div className="af-poster-bar">
        <Link to="/" className="af-back">
          ← Back to desk
        </Link>
        <div className="right">
          <span className="hint">Print or Save as PDF, letter size</span>
          <button
            className="af-confirm"
            type="button"
            onClick={() => window.print()}
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="af-poster" role="img" aria-label={poster.headline}>
        <div className="phead">
          <svg className="roof" viewBox="0 0 64 40" aria-hidden="true">
            <path
              d="M4 30 L32 6 L60 30"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="44" y="10" width="7" height="12" rx="1.5" fill="currentColor" />
          </svg>
          <span className="kind">{KIND_LABEL[poster.kind] ?? "Featured"}</span>
        </div>

        <div className="eyebrow">{poster.eyebrow}</div>
        <h1>{poster.headline}</h1>
        {listing && (
          <div className="addr">
            {listing.address}, {listing.city}
            {listing.price > 0 ? ` · $${listing.price.toLocaleString("en-US")}` : ""}
          </div>
        )}
        {listing?.photoUrl && (
          <div className="photo">
            <img
              src={listing.photoUrl}
              alt={`${listing.address}, ${listing.city}`}
            />
          </div>
        )}

        <ul className="bullets">
          {poster.bullets.map((b: string, i: number) => (
            <li key={i}>
              <span className="check" aria-hidden="true">
                ✓
              </span>
              {b}
            </li>
          ))}
        </ul>

        <div className="cta">{poster.cta}</div>

        <div className="pfoot">
          <div className="script">Leslie Smith</div>
          <div className="lines">
            <span>{owner.phone}</span>
            <span>LeslieSmithSo@kw.com</span>
            <span>lesliesmith.kw.com</span>
            <span>{owner.dre}</span>
          </div>
          <div className="serving">
            {owner.brokerage} · proudly serving {owner.serviceArea.toLowerCase()}
          </div>
        </div>
      </div>
    </div>
  );
}
