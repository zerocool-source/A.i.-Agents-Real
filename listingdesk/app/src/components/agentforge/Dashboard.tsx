import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import {
  approveWalkthrough,
  createListing,
  createTask,
  deleteListing,
  deleteListingPhoto,
  deleteTask,
  generateWalkthrough,
  pullListingPhoto,
  importListing,
  rateActivity,
  runTask,
  sendChat,
  setListingStatus,
  subscribeDesk,
  uploadListingPhoto,
} from "../../lib/agentforge/functions";
import { renderMarkdown } from "../../lib/agentforge/markdown";
import { parsePrice } from "../../lib/agentforge/price";
import type {
  ActivityItem,
  AdsPanel,
  Billing,
  Campaign,
  ChatMessage,
  Document,
  EmailPanel,
  LeadContact,
  Listing,
  ListingStatus,
  Metrics,
  Owner,
  SitePanel,
  SocialPanel,
  Task,
  TeamMember,
} from "../../lib/agentforge/types";
import { LISTING_STAGES, STAGE_LABELS } from "../../lib/agentforge/types";
import { OpsBand } from "./OpsBand";
import { timeAgo } from "./Shell";

export interface DashboardData {
  owner: Owner;
  social: SocialPanel;
  email: EmailPanel;
  site: SitePanel;
  team: TeamMember[];
  ads: AdsPanel;
  billing: Billing;
  listings: Listing[];
  campaigns: Campaign[];
  leads: LeadContact[];
  tasks: Task[];
  documents: Document[];
  activity: ActivityItem[];
  chat: ChatMessage[];
  metrics: Metrics;
}

export function Dashboard(props: DashboardData) {
  const router = useRouter();
  const refresh = () => router.invalidate();
  return (
    <>
      <AgentBar {...props} onChanged={refresh} />
      <HeroBand {...props} />
      <Skyline />
      <MarketMap listings={props.listings} />
      <OpsBand
        social={props.social}
        email={props.email}
        site={props.site}
        team={props.team}
        ads={props.ads}
        billing={props.billing}
        onChanged={refresh}
      />
      <div className="af-grid">
        <WorkColumn {...props} onChanged={refresh} />
        <ListingBoard {...props} onChanged={refresh} />
        <FeedRail {...props} onChanged={refresh} />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Agent bar: who's on shift, what just shipped, god mode, the hire.   */

function AgentBar({
  activity,
  listings,
  campaigns,
  leads,
  metrics,
  billing,
  onChanged,
}: DashboardData & { onChanged: () => void }) {
  const [hiring, setHiring] = useState(false);
  const latest = [...activity].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];

  const agents = [
    { name: "Walkthrough Agent", count: metrics.walkthroughs, unit: "scripts" },
    { name: "Campaign Agent", count: campaigns.length, unit: "campaigns" },
    {
      name: "Follow-Up Agent",
      count: leads.filter((l) => l.followUpDocumentId).length,
      unit: "sequences",
    },
    { name: "Intake Agent", count: listings.length, unit: "listings" },
  ];

  async function hire() {
    if (hiring || billing.subscribed) return;
    setHiring(true);
    try {
      await subscribeDesk();
    } finally {
      setHiring(false);
      onChanged();
    }
  }

  function godMode() {
    const input = document.getElementById("af-console-input");
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => (input as HTMLInputElement | null)?.focus(), 450);
  }

  return (
    <section className="af-agentbar" aria-label="Your agents on shift">
      <div className="af-ticker">
        <span className="ok">● Shipped</span>
        <span className="line">
          &gt; {latest ? latest.message : "Your desk is live."}
        </span>
      </div>
      <div className="af-crew">
        {agents.map((a) => (
          <div className="af-agentchip" key={a.name}>
            <span className="dot" aria-hidden="true" />
            <span>
              <b>{a.name}</b>
              <i>
                on shift · {a.count} {a.unit}
              </i>
            </span>
          </div>
        ))}
        <button className="af-godmode" type="button" onClick={godMode}>
          God mode
        </button>
        <div className="af-hire">
          <span>
            <b>Your AI employee</b>
            <i>$6.67/day · works while you sleep</i>
          </span>
          {billing.subscribed ? (
            <span className="active">Hired ✓</span>
          ) : (
            <button
              type="button"
              onClick={hire}
              disabled={hiring}
              className="cta"
            >
              {hiring ? "Hiring…" : "Subscribe · $200/mo"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Hero: flyer-style band. Copy left, Leslie's agent card right.       */

function HeroBand({ owner, listings, metrics }: DashboardData) {
  const activeCount = listings.filter(
    (l) => l.status === "active" || l.status === "coming-soon",
  ).length;

  return (
    <section className="af-hero" aria-label="Your desk">
      <div className="af-hero-photo" aria-hidden="true">
        <img src="/assets/home-hero.webp" alt="" />
      </div>
      <div className="af-hero-copy">
        <div className="af-script">Hi, {owner.name}.</div>
        <h1>Every listing gets its walkthrough.</h1>
        <p className="lede">
          Stage the listing, press generate, and the desk writes the hook, the
          shot list, and the caption before the sign is in the yard. Film it
          on your phone; post it the same day.
        </p>
        <div className="af-readouts">
          <Readout k="On market" v={String(activeCount)} />
          <Readout k="Walkthroughs" v={String(metrics.walkthroughs)} />
          <Readout k="Leads this week" v={String(metrics.leadsThisWeek)} />
          <Readout k="Showings" v={String(metrics.showings)} />
        </div>
      </div>
      <AgentCard owner={owner} />
    </section>
  );
}

// A quiet neighborhood silhouette dividing the hero from the work.
function Skyline() {
  return (
    <div className="af-skyline" aria-hidden="true">
      <svg
        viewBox="0 0 1200 46"
        preserveAspectRatio="none"
        focusable="false"
      >
        <path
          d="M0 46 L0 30 L40 30 L60 14 L80 30 L120 30 L120 22 L150 22 L150 30
             L190 30 L215 10 L240 30 L280 30 L280 18 L310 18 L310 30 L350 30
             L375 12 L400 30 L448 30 L448 24 L470 24 L470 30 L520 30 L545 8
             L570 30 L620 30 L620 20 L648 20 L648 30 L690 30 L715 14 L740 30
             L790 30 L790 22 L818 22 L818 30 L860 30 L885 10 L910 30 L955 30
             L955 24 L980 24 L980 30 L1025 30 L1050 12 L1075 30 L1120 30
             L1120 20 L1150 20 L1150 30 L1200 30 L1200 46 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Her money on the map: a real map (live street + satellite tiles)    */
/* with a priced pin on every address she has out there. Leaflet is    */
/* vendored under /vendor/leaflet and loaded client-side only, so SSR  */
/* still renders the money band and the pin list underneath.           */

const fmtShort = (n: number) =>
  // 999,500+ rounds into the millions so it never prints "$1000K".
  n >= 999_500
    ? `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, "")}M`
    : n >= 1_000
      ? `$${Math.round(n / 1_000)}K`
      : `$${n}`;
const fmtLong = (n: number) => `$${n.toLocaleString("en-US")}`;

// Popup HTML is assembled as a string for Leaflet, so anything she typed
// (addresses, cities) must be escaped before it goes in.
const escHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] as string,
  );

let leafletLoader: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  const w = window as any;
  if (!leafletLoader) {
    leafletLoader = new Promise((resolve, reject) => {
      // Both the stylesheet AND the script must land: without leaflet.css
      // the tile panes have no positioning and the map renders as garbage,
      // so a css failure has to reach the same "failed" fallback.
      let cssReady = false;
      let jsReady = false;
      const settle = () => {
        if (cssReady && jsReady)
          w.L?.map ? resolve(w.L) : reject(new Error("leaflet missing"));
      };
      let link = document.querySelector<HTMLLinkElement>(
        'link[data-af-leaflet="1"]',
      );
      if (link?.sheet) {
        cssReady = true;
      } else {
        if (!link) {
          link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "/vendor/leaflet/leaflet.css";
          link.dataset.afLeaflet = "1";
          document.head.appendChild(link);
        }
        link.addEventListener("load", () => {
          cssReady = true;
          settle();
        });
        link.addEventListener("error", () =>
          reject(new Error("leaflet css failed")),
        );
        // Retry safety: if the sheet applied before our listener attached.
        const poll = window.setInterval(() => {
          if (link?.sheet) {
            cssReady = true;
            window.clearInterval(poll);
            settle();
          }
        }, 250);
        window.setTimeout(() => window.clearInterval(poll), 15000);
      }
      if (w.L?.map) {
        jsReady = true;
        settle();
      } else {
        const js = document.createElement("script");
        js.src = "/vendor/leaflet/leaflet.js";
        js.async = true;
        js.onload = () => {
          jsReady = true;
          settle();
        };
        js.onerror = () => reject(new Error("leaflet js failed"));
        document.body.appendChild(js);
      }
    });
    // Allow a retry on a later mount if the network hiccupped.
    leafletLoader.catch(() => {
      leafletLoader = null;
    });
  }
  return leafletLoader;
}

const MAP_STATUS: Record<
  ListingStatus,
  { label: string; cls: string }
> = {
  active: { label: "Active", cls: "active" },
  "coming-soon": { label: "Coming soon", cls: "coming-soon" },
  pending: { label: "Closing (in escrow)", cls: "pending" },
  sold: { label: "Sold", cls: "sold" },
};

function MarketMap({ listings }: { listings: Listing[] }) {
  const mapped = listings.filter(
    (l): l is Listing & { lat: number; lng: number } =>
      typeof l.lat === "number" && typeof l.lng === "number",
  );
  const unmapped = listings.length - mapped.length;

  const sum = (xs: Listing[]) =>
    xs.reduce((t, l) => t + (l.price > 0 ? l.price : 0), 0);
  const live = listings.filter(
    (l) => l.status === "active" || l.status === "coming-soon",
  );
  const escrow = listings.filter((l) => l.status === "pending");
  const sold = listings.filter((l) => l.status === "sold");
  const liveSum = sum(live);
  const escrowSum = sum(escrow);
  const soldSum = sum(sold);
  const herSide = Math.round((liveSum + escrowSum) * 0.025);

  const holderRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const baseRef = useRef<{ streets: any; sat: any; labels: any } | null>(null);
  const pinsRef = useRef<{
    group: any;
    markers: Record<string, any>;
  } | null>(null);
  const fitKeyRef = useRef("");
  const openedOnceRef = useRef(false);
  const [base, setBase] = useState<"streets" | "sat">("sat");
  const [mapState, setMapState] = useState<"loading" | "ready" | "failed">(
    "loading",
  );

  // Changes whenever anything a pin shows changes, so markers rebuild.
  const pinsKey = mapped
    .map((l) =>
      [l.id, l.lat, l.lng, l.price, l.status, l.photoUrl ?? ""].join("|"),
    )
    .join(";");

  useEffect(() => {
    let dead = false;
    loadLeaflet()
      .then((L) => {
        if (dead || !holderRef.current || mapRef.current) return;
        const map = L.map(holderRef.current, {
          scrollWheelZoom: false,
          zoomControl: true,
        });
        map.setView([33.57, -117.16], 10);
        // Wheel zoom only after she clicks in, so the page still scrolls past.
        map.on("click", () => map.scrollWheelZoom.enable());
        map.on("mouseout", () => map.scrollWheelZoom.disable());
        // Same courtesy on phones: one-finger swipes scroll the page until
        // she taps the map, then dragging pans it. Pinch zoom always works.
        if (L.Browser?.mobile) {
          map.dragging.disable();
          map.on("click", () => map.dragging.enable());
        }
        map.createPane("aflabels").style.zIndex = "350";
        const streets = L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
          {
            subdomains: "abcd",
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
          },
        );
        const sat = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { maxZoom: 19, attribution: "Esri, Maxar, Earthstar Geographics" },
        );
        const labels = L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
          { subdomains: "abcd", maxZoom: 19, pane: "aflabels" },
        );
        baseRef.current = { streets, sat, labels };
        mapRef.current = map;
        setMapState("ready");
      })
      .catch(() => {
        if (!dead) setMapState("failed");
      });
    return () => {
      dead = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      baseRef.current = null;
      pinsRef.current = null;
    };
  }, []);

  // Basemap toggle: satellite (with readable labels) or modern streets.
  useEffect(() => {
    const map = mapRef.current;
    const layers = baseRef.current;
    if (!map || !layers || mapState !== "ready") return;
    if (base === "sat") {
      map.removeLayer(layers.streets);
      layers.sat.addTo(map);
      layers.labels.addTo(map);
    } else {
      map.removeLayer(layers.sat);
      map.removeLayer(layers.labels);
      layers.streets.addTo(map);
    }
  }, [base, mapState]);

  // Priced pins with a house card popup. Rebuilds when pin data changes,
  // but keeps her view and any open popup: fitBounds only fires when the
  // SET of pinned listings changes, and an open house card reopens on its
  // rebuilt marker instead of vanishing mid-read.
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!L || !map || mapState !== "ready") return;
    let openId: string | null = null;
    if (pinsRef.current) {
      for (const [id, m] of Object.entries(
        pinsRef.current.markers as Record<string, any>,
      )) {
        if (m.isPopupOpen?.()) openId = id;
      }
      map.removeLayer(pinsRef.current.group);
      pinsRef.current = null;
    }
    const group = L.layerGroup();
    const markers: Record<string, any> = {};
    for (const l of mapped) {
      const st = MAP_STATUS[l.status];
      const chip = l.price > 0 ? fmtShort(l.price) : "TBD";
      const icon = L.divIcon({
        className: "af-pinhost",
        iconSize: [0, 0],
        html: `<span class="af-pricepin ${st.cls}">${escHtml(chip)}</span>`,
      });
      const marker = L.marker([l.lat, l.lng], {
        icon,
        title: `${l.address}, ${l.city}`,
      });
      marker.bindPopup(
        `<div class="af-mappop">` +
          `<div class="ph${l.photoUrl ? "" : " empty"}">` +
          (l.photoUrl
            ? `<img src="${escHtml(l.photoUrl)}" alt="${escHtml(l.address)}" />`
            : "") +
          `<span class="badge ${st.cls}">${st.label}</span></div>` +
          `<div class="bd">` +
          `<b>${l.price > 0 ? fmtLong(l.price) : "Price TBD"}</b>` +
          `<span class="ad">${escHtml(l.address)}, ${escHtml(l.city)}</span>` +
          `<span class="ft">${l.beds} bd · ${l.baths} ba · ${l.sqft.toLocaleString("en-US")} sqft</span>` +
          `<a href="#listing-${escHtml(l.id)}">Open the listing card ↓</a>` +
          `</div></div>`,
        { maxWidth: 280, className: "af-popwrap" },
      );
      group.addLayer(marker);
      markers[l.id] = marker;
    }
    group.addTo(map);
    pinsRef.current = { group, markers };
    // Reopen whatever she had open; on the very first paint, open the
    // freshest live listing so the map lands with a house card showing.
    const opener =
      openId && markers[openId]
        ? markers[openId]
        : !openedOnceRef.current
          ? markers[
              (mapped.find((l) => l.status === "active") ??
                mapped.find((l) => l.status === "coming-soon") ??
                mapped[0])?.id ?? ""
            ]
          : undefined;
    if (opener) {
      opener.openPopup();
      openedOnceRef.current = true;
    }
    const idsKey = mapped
      .map((l) => l.id)
      .sort()
      .join(",");
    if (mapped.length > 0 && idsKey !== fitKeyRef.current) {
      const bounds = L.latLngBounds(mapped.map((l) => [l.lat, l.lng]));
      map.fitBounds(bounds.pad(0.3), { maxZoom: 12, paddingTopLeft: [0, 60] });
    }
    fitKeyRef.current = idsKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapState, pinsKey]);

  return (
    <section className="af-map" aria-label="Her listings on a live map">
      <header>
        <div className="ttl">
          <h2>Her money, on the map</h2>
          <p className="sub">
            Real streets, real satellite — every address she has out there,
            priced. Tap a pin to see the house.
          </p>
        </div>
        <a className="af-opbtn" href="#listings-board">
          + Put a listing on the map
        </a>
      </header>

      <div className="af-moneyband" aria-label="Money on the market">
        <div className="mb live">
          <b>{fmtLong(liveSum)}</b>
          <span>
            Live on the market · {live.length}{" "}
            {live.length === 1 ? "home" : "homes"}
          </span>
        </div>
        <div className="mb escrow">
          <b>{fmtLong(escrowSum)}</b>
          <span>
            In escrow, closing · {escrow.length}{" "}
            {escrow.length === 1 ? "home" : "homes"}
          </span>
        </div>
        <div className="mb sold">
          <b>{fmtLong(soldSum)}</b>
          <span>
            Sold volume · {sold.length}{" "}
            {sold.length === 1 ? "home" : "homes"}
          </span>
        </div>
        <div className="mb gci">
          <b>≈ {fmtLong(herSide)}</b>
          <span>Her side at 2.5% when it all closes</span>
        </div>
      </div>

      <div className="frame real">
        <div
          className="holder"
          ref={holderRef}
          aria-label="Interactive map of her listings"
        />
        {mapState !== "ready" && (
          <div className={`mapfallback ${mapState}`}>
            {mapState === "loading"
              ? "Waking up the live map…"
              : "The live map could not load — her pins are listed below."}
          </div>
        )}
        <div className="basemap" role="group" aria-label="Map style">
          <button
            type="button"
            className={base === "streets" ? "on" : ""}
            onClick={() => setBase("streets")}
          >
            Map
          </button>
          <button
            type="button"
            className={base === "sat" ? "on" : ""}
            onClick={() => setBase("sat")}
          >
            Satellite
          </button>
        </div>
      </div>

      <div className="af-pinrow">
        {mapped.map((l) => (
          <a
            key={l.id}
            className={`pinchip ${MAP_STATUS[l.status].cls}`}
            href={`#listing-${l.id}`}
          >
            <i aria-hidden="true" />
            <b>{l.price > 0 ? fmtShort(l.price) : "TBD"}</b>
            <span>
              {l.address}, {l.city}
            </span>
            <em>{MAP_STATUS[l.status].label}</em>
          </a>
        ))}
        {unmapped > 0 && (
          <span className="pinchip off">
            {unmapped} listing{unmapped === 1 ? "" : "s"} need a farm-area city
            to appear on the map
          </span>
        )}
      </div>

      <div className="af-maplegend under">
        {(Object.keys(MAP_STATUS) as ListingStatus[]).map((st) => (
          <span className={`lg ${MAP_STATUS[st].cls}`} key={st}>
            <i aria-hidden="true" />
            {MAP_STATUS[st].label}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Her real photos on each listing                                     */

async function downscalePhoto(file: File): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bmp, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1] ?? null;
  } catch {
    return null;
  }
}

const PHOTO_ERRORS: Record<string, string> = {
  "storage not available": "Photo storage is still provisioning. Try again in a minute.",
  "unsupported type": "That file type is not supported. Use JPG, PNG, or WebP.",
  "bad image data": "That file could not be read as an image.",
  "photo too large": "That photo is too large. Try a smaller one.",
  "listing not found": "This listing no longer exists. Refresh the desk.",
};

export function PhotoStrip({
  listing,
  busyId,
  onBusy,
  onChanged,
}: {
  listing: Listing;
  busyId: string | null;
  onBusy: (id: string | null) => void;
  onChanged: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photos = listing.photos ?? [];

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 12);
    e.target.value = "";
    if (!files.length || uploading || busyId !== null) return;
    setUploading(true);
    setError(null);
    // Lock the card's other actions while uploads write to the store.
    onBusy(listing.id);
    try {
      for (const f of files) {
        const dataBase64 = await downscalePhoto(f);
        if (!dataBase64) {
          setError("One file could not be read as an image.");
          continue;
        }
        const res = await uploadListingPhoto({
          data: {
            listingId: listing.id,
            dataBase64,
            contentType: "image/jpeg",
          },
        });
        if (res && "error" in res) {
          setError(PHOTO_ERRORS[res.error] ?? "Upload failed. Try again.");
          break;
        }
      }
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      onBusy(null);
      onChanged();
    }
  }

  async function remove(url: string) {
    if (!window.confirm("Remove this photo?")) return;
    try {
      await deleteListingPhoto({ data: { listingId: listing.id, url } });
    } catch {
      setError("Could not remove the photo. Try again.");
    }
    onChanged();
  }

  return (
    <div className="af-photostrip">
      {photos.map((u) => (
        <div className="ph" key={u}>
          <img src={u} alt={`Photo of ${listing.address}`} loading="lazy" />
          <button
            type="button"
            aria-label="Remove photo"
            onClick={() => remove(u)}
          >
            ✕
          </button>
        </div>
      ))}
      <label className={`add ${uploading ? "busy" : ""}`}>
        {uploading ? "Uploading…" : photos.length ? "+ Photos" : "+ Add her real photos"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          disabled={uploading || busyId !== null}
          onChange={onFiles}
        />
      </label>
      {error && <span className="err">{error}</span>}
    </div>
  );
}

function Readout({ k, v }: { k: string; v: string }) {
  return (
    <div className="af-readout">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}

// The flyer identity block: her photo in front of the house up top, the
// burgundy panel with her contacts and the gold key divider below.
function AgentCard({ owner }: { owner: Owner }) {
  return (
    <aside className="af-agentcard" aria-label="Your card">
      <div className="photo">
        <img
          src={owner.photoUrl ?? "/assets/leslie.webp"}
          alt={`${owner.name} Smith in front of a Temecula home`}
        />
      </div>
      <div className="inner">
      <div className="hi">Hi, I'm</div>
      <div className="name">Leslie Smith</div>
      <div className="key" aria-hidden="true">
        <svg viewBox="0 0 96 14" focusable="false">
          <circle
            cx="8"
            cy="7"
            r="5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
          />
          <line
            x1="13"
            y1="7"
            x2="92"
            y2="7"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <line
            x1="78"
            y1="7"
            x2="78"
            y2="12"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <line
            x1="86"
            y1="7"
            x2="86"
            y2="12"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="tagline">
        Your local real estate resource. Helping families buy, sell, and build
        wealth through real estate.
      </div>
      <div className="rows">
        <span>{owner.phone}</span>
        <span>LeslieSmithSo@kw.com</span>
        <span>lesliesmith.kw.com</span>
        <span>{owner.dre}</span>
      </div>
      <div className="serving">
        Proudly serving {owner.serviceArea.toLowerCase()}
      </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Column 1: task queue + document index                               */

function WorkColumn({
  tasks,
  documents,
  listings,
  onChanged,
}: DashboardData & { onChanged: () => void }) {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const open = tasks.filter((t) => t.status !== "done");

  async function onRun(id: string) {
    setRunningId(id);
    try {
      await runTask({ data: { id } });
    } finally {
      setRunningId(null);
      onChanged();
    }
  }

  return (
    <div>
      <section className="af-section">
        <header>
          <h2>Task queue</h2>
          <span className="count">{open.length} open</span>
        </header>
        {open.length > 0 ? (
          <div className="af-rows">
            {open.map((t) => (
              <div className="af-row" key={t.id}>
                <div>
                  <div className="t">{t.title}</div>
                  {t.description && <div className="d">{t.description}</div>}
                  <div>
                    {t.tags.map((tag) => (
                      <span key={tag} className="af-chip">
                        {tag}
                      </span>
                    ))}
                    {t.status === "in-progress" && (
                      <span className="af-chip live">In progress</span>
                    )}
                  </div>
                </div>
                <div className="side">
                  <button
                    className="af-run"
                    onClick={() => onRun(t.id)}
                    disabled={runningId !== null}
                    type="button"
                  >
                    {runningId === t.id ? (
                      <>
                        Running<span className="af-blink">…</span>
                      </>
                    ) : (
                      "Run"
                    )}
                  </button>
                  <button
                    className="af-x"
                    type="button"
                    aria-label={`Delete task: ${t.title}`}
                    disabled={runningId !== null}
                    onClick={async () => {
                      if (!window.confirm("Delete this task?")) return;
                      await deleteTask({ data: { id: t.id } });
                      onChanged();
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="af-rows">
            <div className="af-row">
              <div className="d">
                The queue is clear. Add a task and the desk picks it up.
              </div>
            </div>
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <button
            className="af-slot"
            onClick={() => setShowNewTask(true)}
            type="button"
          >
            New task
          </button>
        </div>
      </section>

      <section className="af-section">
        <header>
          <h2>Documents</h2>
          <span className="count">{documents.length} filed</span>
        </header>
        <div className="af-index">
          {documents.slice(0, 6).map((d, i) => (
            <Link to="/docs/$docId" params={{ docId: d.id }} key={d.id}>
              <span className="no">{String(i + 1).padStart(3, "0")}</span>
              <span>
                <span className="title">{d.title}</span>
                <span className="af-chip" style={{ marginLeft: 10 }}>
                  {d.kind}
                </span>
              </span>
              <span className="when">{timeAgo(d.createdAt)}</span>
            </Link>
          ))}
        </div>
        {documents.length > 6 && (
          <div style={{ marginTop: 10 }}>
            <Link to="/docs" className="af-back">
              Full archive →
            </Link>
          </div>
        )}
      </section>

      {showNewTask && (
        <NewTaskModal
          listings={listings}
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

/* ------------------------------------------------------------------ */
/* Column 2: listing board                                             */

function ListingBoard({
  listings,
  documents,
  onChanged,
}: DashboardData & { onChanged: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showNewListing, setShowNewListing] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  async function onImport() {
    const url = importUrl.trim();
    if (url.length < 8 || importing) return;
    setImporting(true);
    try {
      await importListing({ data: { url } });
      setImportUrl("");
    } finally {
      setImporting(false);
      onChanged();
    }
  }

  async function onDelete(l: Listing) {
    if (
      !window.confirm(
        `Remove ${l.address} from the board? Its documents stay filed.`,
      )
    )
      return;
    setBusyId(l.id);
    try {
      await deleteListing({ data: { id: l.id } });
    } finally {
      setBusyId(null);
      onChanged();
    }
  }

  async function onWalkthrough(id: string) {
    setBusyId(id);
    try {
      await generateWalkthrough({ data: { id } });
    } finally {
      setBusyId(null);
      onChanged();
    }
  }

  async function onApprove(documentId: string, listingId: string) {
    setBusyId(listingId);
    try {
      await approveWalkthrough({ data: { documentId } });
    } finally {
      setBusyId(null);
      onChanged();
    }
  }

  async function advance(listing: Listing) {
    const i = LISTING_STAGES.indexOf(listing.status);
    if (i >= LISTING_STAGES.length - 1) return;
    setBusyId(listing.id);
    try {
      await setListingStatus({
        data: {
          id: listing.id,
          status: LISTING_STAGES[i + 1] as ListingStatus,
        },
      });
    } finally {
      setBusyId(null);
      onChanged();
    }
  }

  return (
    <div>
      <section className="af-section" id="listings-board">
        <header>
          <h2>Listings</h2>
          <button
            className="af-opbtn"
            type="button"
            onClick={() => setShowNewListing(true)}
          >
            + Add your listing
          </button>
        </header>
        <div className="af-import">
          <input
            className="af-opinput"
            placeholder="Or paste a Zillow listing link to import"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onImport();
            }}
            aria-label="Listing link to import"
          />
          <button
            className="af-opbtn solid"
            type="button"
            disabled={importing || importUrl.trim().length < 8}
            onClick={onImport}
          >
            {importing ? "Importing…" : "Import"}
          </button>
        </div>
        {listings.map((l) => (
          <article className="af-listing" key={l.id} id={`listing-${l.id}`}>
            {l.photoUrl && (
              <div className="cover">
                <img src={l.photoUrl} alt={`${l.address}, ${l.city}`} />
                <span className={`badge ${l.status}`}>
                  {STAGE_LABELS[l.status]}
                </span>
              </div>
            )}
            <div className="head">
              <div>
                <h3>{l.address}</h3>
                <div className="sub">
                  {l.city} · {l.beds} bd · {l.baths} ba ·{" "}
                  {l.sqft.toLocaleString("en-US")} sqft
                </div>
              </div>
              <span className="af-price">
                {l.price > 0 ? `$${l.price.toLocaleString("en-US")}` : "Price TBD"}
              </span>
              <button
                className="af-x"
                type="button"
                aria-label={`Remove listing: ${l.address}`}
                disabled={busyId !== null}
                onClick={() => onDelete(l)}
              >
                ✕
              </button>
            </div>
            <p className="features">{l.features}</p>
            {l.notes && <p className="notes">{l.notes}</p>}
            <PhotoStrip listing={l} busyId={busyId} onBusy={setBusyId} onChanged={onChanged} />
            {l.sourceUrl && (
              <div className="af-sourcerow">
                <a
                  className="af-opbtn"
                  href={l.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  View the live listing ↗
                </a>
                <button
                  className="af-opbtn"
                  type="button"
                  disabled={busyId !== null}
                  onClick={async () => {
                    setBusyId(l.id);
                    try {
                      await pullListingPhoto({ data: { id: l.id } });
                    } finally {
                      setBusyId(null);
                      onChanged();
                    }
                  }}
                >
                  {busyId === l.id ? "Pulling…" : "Pull the listing photo"}
                </button>
              </div>
            )}
            <div className="af-stage" aria-label={`Stage: ${STAGE_LABELS[l.status]}`}>
              {LISTING_STAGES.map((s, i) => (
                <span
                  key={s}
                  className={`step ${LISTING_STAGES.indexOf(l.status) >= i ? "on" : ""}`}
                  title={STAGE_LABELS[s]}
                />
              ))}
              <span className="label">{STAGE_LABELS[l.status]}</span>
              <span className="leads">{l.leadCount} leads</span>
            </div>
            <div className="acts">
              {l.walkthroughDocumentId ? (
                <Link
                  to="/docs/$docId"
                  params={{ docId: l.walkthroughDocumentId }}
                  className="af-walk filed"
                >
                  <i aria-hidden="true" />
                  Read walkthrough
                </Link>
              ) : (
                <button
                  className="af-walk"
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => onWalkthrough(l.id)}
                >
                  <i aria-hidden="true" />
                  {busyId === l.id ? (
                    <>
                      Writing<span className="af-blink">…</span>
                    </>
                  ) : (
                    "Generate walkthrough"
                  )}
                </button>
              )}
              {l.status !== "sold" && (
                <button
                  className="af-advance"
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => advance(l)}
                >
                  Advance →
                </button>
              )}
            </div>
            {(() => {
              const walkDoc = l.walkthroughDocumentId
                ? documents.find((d) => d.id === l.walkthroughDocumentId)
                : undefined;
              if (!walkDoc) {
                return l.status !== "sold" ? (
                  <div className="mkt">
                    <Link to="/studio" className="af-back">
                      Make ads + poster →
                    </Link>
                  </div>
                ) : null;
              }
              return (
                <div className="mkt">
                  {walkDoc.approval === "approved" ? (
                    <span className="af-chip live">In marketing ✓</span>
                  ) : (
                    <button
                      className="af-opbtn"
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => onApprove(walkDoc.id, l.id)}
                    >
                      {busyId === l.id
                        ? "Approving…"
                        : "Approve for marketing"}
                    </button>
                  )}
                  <Link to="/studio" className="af-back">
                    Make ads →
                  </Link>
                </div>
              );
            })()}
          </article>
        ))}
        <button
          className="af-slot"
          onClick={() => setShowNewListing(true)}
          type="button"
        >
          New listing
        </button>
      </section>

      {showNewListing && (
        <NewListingModal
          onClose={() => setShowNewListing(false)}
          onCreated={() => {
            setShowNewListing(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Column 3: wire log + console                                        */

function FeedRail({
  activity,
  chat,
  onChanged,
}: DashboardData & { onChanged: () => void }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const message = input.trim();
    if (!message || sending) return;
    setSending(true);
    setInput("");
    try {
      await sendChat({ data: { message } });
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
      new Date(a.item.createdAt).getTime() -
      new Date(b.item.createdAt).getTime(),
  );

  return (
    <section className="af-feedrail" aria-label="Desk wire log">
      <header>
        <h2>Wire log</h2>
        <span className="af-live">Live</span>
      </header>
      <div className="af-wire">
        {items.slice(-30).map((entry) => (
          <div
            className={`entry ${entry.type === "chat" && entry.item.role === "user" ? "user" : ""}`}
            key={entry.item.id}
          >
            <div
              className="af-md"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(
                  entry.type === "activity"
                    ? entry.item.message
                    : entry.item.content,
                ),
              }}
            />
            <div className="meta">
              {entry.type === "activity"
                ? entry.item.kind
                : entry.item.role === "user"
                  ? "you"
                  : "the desk"}{" "}
              · {timeAgo(entry.item.createdAt)}
              {entry.type === "activity" &&
                entry.item.kind === "shipped" && (
                  <span className="af-rate">
                    <button
                      type="button"
                      className={entry.item.rating === "up" ? "on" : ""}
                      aria-label="Rate this good"
                      onClick={async () => {
                        await rateActivity({
                          data: { id: entry.item.id, rating: "up" },
                        });
                        onChanged();
                      }}
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      className={entry.item.rating === "down" ? "on" : ""}
                      aria-label="Rate this bad"
                      onClick={async () => {
                        await rateActivity({
                          data: { id: entry.item.id, rating: "down" },
                        });
                        onChanged();
                      }}
                    >
                      👎
                    </button>
                  </span>
                )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="entry">
            Thinking<span className="af-blink">…</span>
          </div>
        )}
      </div>
      <div className="af-console">
        <span className="prompt">&gt;_</span>
        <input
          id="af-console-input"
          placeholder="Ask your desk anything"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          disabled={sending}
          aria-label="Ask your desk anything"
        />
        <button
          className="af-send"
          onClick={send}
          disabled={sending}
          type="button"
        >
          Send
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Modals                                                              */

function NewTaskModal({
  listings,
  onClose,
  onCreated,
}: {
  listings: Listing[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("content");
  const [listingId, setListingId] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    await createTask({
      data: {
        title,
        description,
        kind: kind as "research" | "outreach" | "followup" | "content" | "ops",
        listingId: listingId || undefined,
      },
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div className="af-modal-backdrop" onClick={onClose}>
      <div className="af-modal" onClick={(e) => e.stopPropagation()}>
        <h3>New task</h3>
        <div className="af-field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="af-field">
          <label>Brief: what should the desk produce?</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="af-field">
          <label>Kind</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="content">Content</option>
            <option value="outreach">Outreach</option>
            <option value="followup">Follow-up</option>
            <option value="research">Research</option>
            <option value="ops">Ops</option>
          </select>
        </div>
        <div className="af-field">
          <label>Listing (optional)</label>
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
            {saving ? "Saving…" : "Queue task"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewListingModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [beds, setBeds] = useState("3");
  const [baths, setBaths] = useState("2");
  const [sqft, setSqft] = useState("");
  const [features, setFeatures] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const priceNum = parsePrice(price);
    if (!address.trim() || !city.trim() || !priceNum) return;
    setSaving(true);
    await createListing({
      data: {
        address,
        city,
        price: priceNum,
        beds: Number(beds) || undefined,
        baths: Number(baths) || undefined,
        sqft: Number(sqft.replace(/[^0-9]/g, "")) || undefined,
        features,
        notes,
      },
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div className="af-modal-backdrop" onClick={onClose}>
      <div className="af-modal" onClick={(e) => e.stopPropagation()}>
        <h3>New listing</h3>
        <div className="af-field">
          <label>Street address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="af-field">
          <label>City</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Temecula"
          />
        </div>
        <div className="af-field">
          <label>List price</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="575000"
            inputMode="numeric"
          />
        </div>
        <div className="af-field af-field-row">
          <span>
            <label>Beds</label>
            <input
              value={beds}
              onChange={(e) => setBeds(e.target.value)}
              inputMode="numeric"
            />
          </span>
          <span>
            <label>Baths</label>
            <input
              value={baths}
              onChange={(e) => setBaths(e.target.value)}
              inputMode="numeric"
            />
          </span>
          <span>
            <label>Sqft</label>
            <input
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              inputMode="numeric"
            />
          </span>
        </div>
        <div className="af-field">
          <label>Key features</label>
          <input
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder="Pool, cul-de-sac, remodeled kitchen…"
          />
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
            {saving ? "Saving…" : "Stage listing"}
          </button>
        </div>
      </div>
    </div>
  );
}
