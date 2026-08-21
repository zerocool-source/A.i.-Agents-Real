import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  createListing,
  importListing,
  postMarketUpdate,
  saveHomeForClient,
  searchArea,
} from "../../lib/agentforge/functions";
import type {
  Client,
  Listing,
  MarketHome,
  MarketStats,
} from "../../lib/agentforge/types";

export interface AreaSearchData {
  clients: Client[];
  listings: Listing[];
  areas: { id: string; label: string }[];
}

interface SearchState {
  source: "live" | "unavailable";
  homes: MarketHome[];
  stats: MarketStats;
  areaLabel: string;
  links: { zillow: string; redfin: string };
  note?: string;
  fetchedAt: string;
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const short = (n: number) =>
  n >= 999_500
    ? `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`
    : `$${Math.round(n / 1000)}K`;

type SortKey = "newest" | "price-asc" | "price-desc" | "ppsf";

export function AreaSearch(props: AreaSearchData) {
  const router = useRouter();
  const [area, setArea] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [beds, setBeds] = useState("");
  const [propertyType, setPropertyType] = useState("any");
  const [sort, setSort] = useState<SortKey>("newest");
  const [limit, setLimit] = useState(24);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SearchState | null>(null);
  const [saveTarget, setSaveTarget] = useState<string>(
    props.clients[0]?.id ?? "",
  );
  const [flash, setFlash] = useState("");
  const [posting, setPosting] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  async function run(nextArea = area) {
    setBusy(true);
    setLimit(24);
    try {
      const num = (v: string) => {
        const n = Number(v.replace(/[^0-9.]/g, ""));
        if (!n) return undefined;
        // "650" means $650k when she types it short.
        return n < 10000 ? Math.round(n * 1000) : Math.round(n);
      };
      const res = (await searchArea({
        data: {
          area: nextArea,
          minPrice: num(minPrice),
          maxPrice: num(maxPrice),
          beds: beds ? Number(beds) : undefined,
          propertyType: propertyType as
            | "house"
            | "condo-townhouse"
            | "land"
            | "any",
        },
      })) as SearchState;
      setResult(res);
    } finally {
      setBusy(false);
    }
  }

  // Open on her whole farm area so the page is useful the moment it loads.
  useEffect(() => {
    run("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const homes = (() => {
    const list = [...(result?.homes ?? [])];
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "ppsf")
      list.sort((a, b) => (a.pricePerSqft ?? 1e9) - (b.pricePerSqft ?? 1e9));
    else
      list.sort(
        (a, b) => (a.daysOnMarket ?? 999) - (b.daysOnMarket ?? 999),
      );
    return list;
  })();

  const mine = new Set(
    props.listings.map((l) => l.address.trim().toLowerCase()),
  );

  async function save(h: MarketHome) {
    if (!saveTarget) {
      setFlash("Add a client first — then you can save homes to them.");
      return;
    }
    const res = await saveHomeForClient({
      data: {
        clientId: saveTarget,
        address: h.address,
        city: h.city,
        price: h.price,
        beds: h.beds,
        baths: h.baths,
        sqft: h.sqft,
        url: h.url,
      },
    });
    const who = props.clients.find((c) => c.id === saveTarget)?.name ?? "client";
    setFlash(
      res.ok
        ? `Saved ${h.address} for ${who}.`
        : res.error === "already saved"
          ? `${h.address} is already on ${who}'s list.`
          : "Could not save that one.",
    );
    router.invalidate();
  }

  async function addToBoard(h: MarketHome) {
    setAddingId(h.id);
    try {
      // With a listing link the desk pulls the real property — the agent's
      // remarks and the listing's own photos come with it.
      if (h.url) {
        const res = await importListing({ data: { url: h.url } });
        setFlash(
          res.real
            ? `${h.address} pulled onto your board with its listing photos.`
            : `${h.address} added — that site would not hand over the details.`,
        );
        router.invalidate();
        return;
      }
      await createListing({
        data: {
          address: h.address,
          city: h.city || "Temecula",
          price: h.price,
          beds: h.beds,
          baths: h.baths,
          sqft: h.sqft,
          features: [
            h.propertyType,
            h.yearBuilt ? `built ${h.yearBuilt}` : "",
            h.lotSqft ? `${h.lotSqft.toLocaleString("en-US")} sqft lot` : "",
          ]
            .filter(Boolean)
            .join(" · "),
          notes: h.url ? `Found in area search: ${h.url}` : undefined,
        },
      });
      setFlash(`${h.address} added to your board.`);
      router.invalidate();
    } finally {
      setAddingId(null);
    }
  }

  async function makePost() {
    if (!result || result.homes.length === 0 || posting) return;
    setPosting(true);
    try {
      await postMarketUpdate({
        data: {
          areaLabel: result.areaLabel,
          count: result.stats.count,
          medianPrice: result.stats.medianPrice,
          medianPpsf: result.stats.medianPpsf,
          medianDom: result.stats.medianDom,
          newThisWeek: result.stats.newThisWeek,
          highlights: homes.slice(0, 5).map((h) => ({
            address: h.address,
            city: h.city,
            price: h.price,
            beds: h.beds,
            baths: h.baths,
            sqft: h.sqft,
          })),
        },
      });
      setFlash(
        "Market update written — the post is in your social drafts and the full script is in Documents.",
      );
      router.invalidate();
    } finally {
      setPosting(false);
    }
  }

  return (
    <>
      <div className="af-doc-head">
        <div className="rule">Area search</div>
        <h2>Every home for sale in her valley.</h2>
        <p className="af-hint">
          Live from the same MLS feed her listings are on — search it for a
          buyer, save homes to their file, pull one onto her own board, or turn
          the numbers into this week's market post.
        </p>
      </div>

      <section className="af-section af-searchbar">
        <div className="af-field af-field-row af-searchfields">
          <span>
            <label>Area</label>
            <select
              value={area}
              onChange={(e) => {
                setArea(e.target.value);
                run(e.target.value);
              }}
            >
              {props.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </span>
          <span>
            <label>Min price</label>
            <input
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="450k"
              inputMode="numeric"
            />
          </span>
          <span>
            <label>Max price</label>
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="700k"
              inputMode="numeric"
            />
          </span>
          <span>
            <label>Beds</label>
            <select value={beds} onChange={(e) => setBeds(e.target.value)}>
              <option value="">Any</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>
          </span>
          <span>
            <label>Type</label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
            >
              <option value="any">Any</option>
              <option value="house">Houses</option>
              <option value="condo-townhouse">Condo / townhome</option>
              <option value="land">Land</option>
            </select>
          </span>
        </div>
        <div className="af-searchacts">
          <button
            className="af-walk"
            type="button"
            disabled={busy}
            onClick={() => run()}
          >
            <i aria-hidden="true" />
            {busy ? (
              <>
                Searching<span className="af-blink">…</span>
              </>
            ) : (
              "Search the market"
            )}
          </button>
          {result && result.homes.length > 0 && (
            <button
              className="af-opbtn solid"
              type="button"
              disabled={posting}
              onClick={makePost}
            >
              {posting ? "Writing…" : "Turn this into a market post"}
            </button>
          )}
          {result && (
            <>
              <a
                className="af-opbtn"
                href={result.links.zillow}
                target="_blank"
                rel="noreferrer noopener"
              >
                Same search on Zillow ↗
              </a>
              <a
                className="af-opbtn"
                href={result.links.redfin}
                target="_blank"
                rel="noreferrer noopener"
              >
                On Redfin ↗
              </a>
            </>
          )}
        </div>
        {flash && <div className="af-flash">{flash}</div>}
      </section>

      {result && result.homes.length > 0 && (
        <section className="af-moneyband af-marketstats">
          <div className="mb live">
            <b>{result.stats.count}</b>
            <span>Homes for sale · {result.areaLabel}</span>
          </div>
          <div className="mb escrow">
            <b>{money(result.stats.medianPrice)}</b>
            <span>Median asking price</span>
          </div>
          <div className="mb sold">
            <b>${result.stats.medianPpsf}</b>
            <span>Median per square foot</span>
          </div>
          <div className="mb gci">
            <b>{result.stats.medianDom} days</b>
            <span>Median time on market · {result.stats.newThisWeek} new this week</span>
          </div>
        </section>
      )}

      <section className="af-section">
        <header>
          <h2>
            {busy
              ? "Searching the MLS…"
              : result
                ? `${homes.length} homes`
                : "Results"}
          </h2>
          <div className="af-sortrow">
            {props.clients.length > 0 && (
              <select
                aria-label="Save homes for"
                value={saveTarget}
                onChange={(e) => setSaveTarget(e.target.value)}
              >
                {props.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    Save for {c.name}
                  </option>
                ))}
              </select>
            )}
            <select
              aria-label="Sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="newest">Newest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="ppsf">Best $/sqft</option>
            </select>
          </div>
        </header>

        {result?.note && <p className="af-hint">{result.note}</p>}

        {busy && !result && (
          <p className="af-hint">Pulling live listings for her area…</p>
        )}

        <div className="af-marketlist">
          {homes.slice(0, limit).map((h) => {
            const isMine = mine.has(h.address.trim().toLowerCase());
            return (
              <article className="af-markethome" key={h.id}>
                <div className="pricecol">
                  <b>{short(h.price)}</b>
                  <span className="full">{money(h.price)}</span>
                  {typeof h.daysOnMarket === "number" && (
                    <span
                      className={`dom ${h.daysOnMarket <= 7 ? "fresh" : h.daysOnMarket > 60 ? "stale" : ""}`}
                    >
                      {h.daysOnMarket === 0
                        ? "New today"
                        : `${h.daysOnMarket}d on market`}
                    </span>
                  )}
                </div>
                <div className="bodycol">
                  <h3>{h.address}</h3>
                  <div className="sub">
                    {h.city}
                    {h.beds ? ` · ${h.beds} bd` : ""}
                    {h.baths ? ` · ${h.baths} ba` : ""}
                    {h.sqft ? ` · ${h.sqft.toLocaleString("en-US")} sqft` : ""}
                    {h.pricePerSqft ? ` · $${h.pricePerSqft}/sqft` : ""}
                  </div>
                  <div className="tags">
                    {h.propertyType && <span>{h.propertyType}</span>}
                    {h.yearBuilt ? <span>Built {h.yearBuilt}</span> : null}
                    {h.hoa ? <span>HOA ${h.hoa}/mo</span> : null}
                    {h.openHouse && <span className="open">Open house</span>}
                    {isMine && <span className="mine">On her board</span>}
                  </div>
                </div>
                <div className="actcol">
                  {h.url && (
                    <a
                      className="af-opbtn"
                      href={h.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      View listing ↗
                    </a>
                  )}
                  {props.clients.length > 0 && (
                    <button
                      className="af-opbtn"
                      type="button"
                      onClick={() => save(h)}
                    >
                      Save for client
                    </button>
                  )}
                  {!isMine && (
                    <button
                      className="af-opbtn"
                      type="button"
                      disabled={addingId === h.id}
                      onClick={() => addToBoard(h)}
                    >
                      {addingId === h.id ? "Adding…" : "Add to my board"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {homes.length > limit && (
          <button
            className="af-opbtn"
            type="button"
            onClick={() => setLimit((n) => n + 24)}
          >
            Show 24 more
          </button>
        )}

        {result && result.source === "unavailable" && (
          <p className="af-hint">
            Her own board is always here:{" "}
            <Link to="/">back to the desk →</Link>
          </p>
        )}
      </section>
    </>
  );
}
