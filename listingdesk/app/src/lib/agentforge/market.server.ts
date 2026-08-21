// Live area search: every home currently for sale around her farm area.
//
// The data comes from the public Redfin download feed, which is sourced from
// the same MLS her listings are on. Zillow blocks server-side reads outright,
// so when she wants Zillow specifically we hand her a deep link that runs the
// identical search there. If the feed is unreachable the desk says so plainly
// instead of inventing homes.
import type { MarketHome, MarketStats } from "./types";

const FEED = "https://www.redfin.com/stingray/api/gis-csv";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// Her farm area, city by city. The box around each center is roughly the
// city footprint; "all" spans the whole valley she works.
export const SEARCH_AREAS: Record<
  string,
  { label: string; lat: number; lng: number; dLat: number; dLng: number }
> = {
  all: { label: "All of her farm area", lat: 33.66, lng: -117.15, dLat: 0.3, dLng: 0.28 },
  temecula: { label: "Temecula", lat: 33.4936, lng: -117.1484, dLat: 0.055, dLng: 0.07 },
  murrieta: { label: "Murrieta", lat: 33.5539, lng: -117.2139, dLat: 0.055, dLng: 0.07 },
  wildomar: { label: "Wildomar", lat: 33.5989, lng: -117.28, dLat: 0.04, dLng: 0.05 },
  "lake elsinore": { label: "Lake Elsinore", lat: 33.6681, lng: -117.3273, dLat: 0.055, dLng: 0.07 },
  menifee: { label: "Menifee", lat: 33.6971, lng: -117.185, dLat: 0.055, dLng: 0.07 },
  winchester: { label: "Winchester", lat: 33.707, lng: -117.0845, dLat: 0.04, dLng: 0.05 },
  hemet: { label: "Hemet", lat: 33.7476, lng: -116.972, dLat: 0.055, dLng: 0.08 },
  "san jacinto": { label: "San Jacinto", lat: 33.7839, lng: -116.9586, dLat: 0.045, dLng: 0.06 },
  perris: { label: "Perris", lat: 33.7825, lng: -117.2286, dLat: 0.055, dLng: 0.07 },
  "canyon lake": { label: "Canyon Lake", lat: 33.685, lng: -117.2726, dLat: 0.03, dLng: 0.035 },
  "sun city": { label: "Sun City", lat: 33.7092, lng: -117.1973, dLat: 0.03, dLng: 0.04 },
  "moreno valley": { label: "Moreno Valley", lat: 33.9425, lng: -117.2297, dLat: 0.07, dLng: 0.09 },
};

// She farms these cities. A bounding box always spills into neighbors, so
// results get filtered back to the city (or the farm list) she asked for.
const FARM_CITIES = [
  "temecula",
  "murrieta",
  "wildomar",
  "lake elsinore",
  "menifee",
  "winchester",
  "hemet",
  "san jacinto",
  "perris",
  "canyon lake",
  "sun city",
  "moreno valley",
  "french valley",
  "homeland",
  "romoland",
  "quail valley",
  "nuevo",
];

export interface SearchQuery {
  area: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  propertyType?: "house" | "condo-townhouse" | "land" | "any";
}

export interface SearchResult {
  source: "live" | "unavailable";
  homes: MarketHome[];
  stats: MarketStats;
  areaLabel: string;
  links: { zillow: string; redfin: string };
  note?: string;
  fetchedAt: string;
}

// Redfin property-type codes: 1 house, 2 condo, 3 townhouse, 4 multi-family,
// 5 land, 6 other, 7 mobile, 8 co-op.
const UIPT: Record<string, string> = {
  any: "1,2,3,4,5,6,7,8",
  house: "1",
  "condo-townhouse": "2,3",
  land: "5",
};

function boxPolygon(lat: number, lng: number, dLat: number, dLng: number): string {
  const w = (lng - dLng).toFixed(4);
  const e = (lng + dLng).toFixed(4);
  const s = (lat - dLat).toFixed(4);
  const n = (lat + dLat).toFixed(4);
  return `${w} ${s},${e} ${s},${e} ${n},${w} ${n},${w} ${s}`;
}

// One request returns at most 350 homes, so the whole valley is pulled as
// three overlapping boxes and merged. Any single city fits in one box.
function polygonsFor(area: string): string[] {
  if (area === "all") {
    return [
      // South: Temecula, Murrieta, Wildomar
      boxPolygon(33.53, -117.19, 0.1, 0.13),
      // Middle: Lake Elsinore, Canyon Lake, Menifee, Sun City, Winchester, Perris
      boxPolygon(33.70, -117.22, 0.12, 0.14),
      // East: Hemet, San Jacinto, Moreno Valley, Romoland, Homeland
      boxPolygon(33.82, -117.02, 0.17, 0.14),
    ];
  }
  const a = SEARCH_AREAS[area] ?? SEARCH_AREAS.all;
  return [boxPolygon(a.lat, a.lng, a.dLat, a.dLng)];
}

// CSV with quoted fields — addresses and remarks carry commas.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const num = (v?: string): number | undefined => {
  if (!v) return undefined;
  const n = Number(v.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

// One shared 10 minute cache per isolate: her filters change more often than
// the market does, and it keeps the desk from hammering the feed.
const cache = new Map<string, { at: number; data: SearchResult }>();
const TTL = 10 * 60 * 1000;

export function zillowLink(q: SearchQuery): string {
  const a = SEARCH_AREAS[q.area] ?? SEARCH_AREAS.all;
  const slug =
    q.area === "all"
      ? "temecula-ca"
      : `${a.label.toLowerCase().replace(/\s+/g, "-")}-ca`;
  const parts: string[] = [];
  if (q.minPrice || q.maxPrice)
    parts.push(`${q.minPrice ?? 0}-${q.maxPrice ?? ""}_price`);
  if (q.beds) parts.push(`${q.beds}-_beds`);
  return `https://www.zillow.com/${slug}/${parts.length ? parts.join("/") + "/" : ""}`;
}

export function redfinLink(q: SearchQuery): string {
  const a = SEARCH_AREAS[q.area] ?? SEARCH_AREAS.all;
  const city = (q.area === "all" ? "Temecula" : a.label).replace(/\s+/g, "-");
  const filters: string[] = [];
  if (q.minPrice) filters.push(`min-price=${Math.round(q.minPrice / 1000)}k`);
  if (q.maxPrice) filters.push(`max-price=${Math.round(q.maxPrice / 1000)}k`);
  if (q.beds) filters.push(`min-beds=${q.beds}`);
  return `https://www.redfin.com/city/CA/${city}${filters.length ? `/filter/${filters.join(",")}` : ""}`;
}

export async function searchMarket(q: SearchQuery): Promise<SearchResult> {
  const area = SEARCH_AREAS[q.area] ? q.area : "all";
  const key = JSON.stringify({ ...q, area });
  const hit = cache.get(key);
  const links = { zillow: zillowLink(q), redfin: redfinLink(q) };
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const polygons = polygonsFor(area);
  const buildParams = (poly: string) => {
    const params = new URLSearchParams({
      al: "1",
      market: "socal",
      num_homes: "350",
      ord: "redfin-recommended-asc",
      page_number: "1",
      poly,
      sf: "1,2,3,5,6,7",
      status: "9",
      uipt: UIPT[q.propertyType ?? "any"] ?? UIPT.any,
      v: "8",
    });
    if (q.minPrice) params.set("min_price", String(q.minPrice));
    if (q.maxPrice) params.set("max_price", String(q.maxPrice));
    if (q.beds) params.set("num_beds", String(q.beds));
    return params;
  };

  const empty: SearchResult = {
    source: "unavailable",
    homes: [],
    stats: { count: 0, medianPrice: 0, medianPpsf: 0, medianDom: 0, newThisWeek: 0 },
    areaLabel: SEARCH_AREAS[area].label,
    links,
    note: "The live MLS feed did not answer just now. Open the same search on Zillow or Redfin below, or try again in a minute.",
    fetchedAt: new Date().toISOString(),
  };

  const fetchOne = async (poly: string): Promise<string | null> => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(`${FEED}?${buildParams(poly).toString()}`, {
        headers: {
          "User-Agent": UA,
          Accept: "text/csv,*/*",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  };

  const texts = (await Promise.all(polygons.map(fetchOne))).filter(
    (t): t is string => typeof t === "string",
  );
  if (texts.length === 0) return empty;

  const rows: string[][] = [];
  let header: string[] | null = null;
  let cappedAny = false;
  for (const text of texts) {
    const parsed = parseCsv(text);
    const hIdx = parsed.findIndex((r) => r[0] === "SALE TYPE");
    if (hIdx < 0) continue;
    if (!header) header = parsed[hIdx].map((h) => h.trim());
    const body = parsed.slice(hIdx + 1);
    if (body.length >= 350) cappedAny = true;
    rows.push(...body);
  }
  if (!header) return empty;
  const col = (name: string) =>
    header.findIndex((h) => h.toUpperCase().startsWith(name));
  const iAddr = col("ADDRESS");
  const iCity = col("CITY");
  const iPrice = col("PRICE");
  const iBeds = col("BEDS");
  const iBaths = col("BATHS");
  const iSqft = col("SQUARE FEET");
  const iLot = col("LOT SIZE");
  const iYear = col("YEAR BUILT");
  const iType = col("PROPERTY TYPE");
  const iStatus = col("STATUS");
  const iDom = col("DAYS ON MARKET");
  const iPpsf = col("$/SQUARE FEET");
  const iHoa = col("HOA");
  const iLat = col("LATITUDE");
  const iLng = col("LONGITUDE");
  const iUrl = col("URL");
  const iMls = col("MLS");
  const iOpen = col("NEXT OPEN HOUSE START");

  const homes: MarketHome[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const address = (r[iAddr] ?? "").trim();
    const price = num(r[iPrice]);
    if (!address || !price) continue;
    const dedupeKey = `${address.toLowerCase()}|${(r[iCity] ?? "").trim().toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const rawUrl = (r[iUrl] ?? "").trim();
    homes.push({
      id: `mh-${homes.length}-${address.replace(/[^A-Za-z0-9]/g, "").slice(0, 18)}`,
      address,
      city: (r[iCity] ?? "").trim(),
      price,
      beds: num(r[iBeds]),
      baths: num(r[iBaths]),
      sqft: num(r[iSqft]),
      lotSqft: num(r[iLot]),
      yearBuilt: num(r[iYear]),
      propertyType: (r[iType] ?? "").trim() || undefined,
      status: (r[iStatus] ?? "").trim() || undefined,
      daysOnMarket: num(r[iDom]),
      pricePerSqft: num(r[iPpsf]),
      hoa: num(r[iHoa]),
      lat: num(r[iLat]),
      lng: num(r[iLng]),
      url: rawUrl
        ? rawUrl.startsWith("http")
          ? rawUrl
          : `https://www.redfin.com${rawUrl}`
        : undefined,
      openHouse: (r[iOpen] ?? "").trim() || undefined,
      mls: (r[iMls] ?? "").trim() || undefined,
    });
  }

  // Keep only the city she searched (or her farm list for "all"), so a box
  // that overlaps Banning or Beaumont does not pollute her numbers.
  const wanted =
    area === "all" ? FARM_CITIES : [SEARCH_AREAS[area].label.toLowerCase()];
  const inArea = homes.filter((h) =>
    wanted.includes(h.city.trim().toLowerCase()),
  );
  const capped = cappedAny;
  homes.length = 0;
  homes.push(...inArea);

  if (homes.length === 0) {
    return {
      ...empty,
      source: "live",
      note: "No homes matched those filters in this area right now. Widen the price range or pick another city.",
    };
  }

  const prices = homes.map((h) => h.price);
  const ppsf = homes.map((h) => h.pricePerSqft ?? 0).filter((n) => n > 0);
  const doms = homes.map((h) => h.daysOnMarket ?? 0).filter((n) => n >= 0);
  const data: SearchResult = {
    source: "live",
    note: capped
      ? "The feed hands back 350 homes per pull, so a busy area may have a few more than these. Narrow by city or price to see everything."
      : undefined,
    homes,
    stats: {
      count: homes.length,
      medianPrice: median(prices),
      medianPpsf: median(ppsf),
      medianDom: median(doms),
      newThisWeek: homes.filter((h) => (h.daysOnMarket ?? 99) <= 7).length,
    },
    areaLabel: SEARCH_AREAS[area].label,
    links,
    fetchedAt: new Date().toISOString(),
  };
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 40) cache.delete(cache.keys().next().value as string);
  return data;
}

/* ------------------------------------------------------------------ */
/* Real listing lookup: paste a link, get the actual property          */

export interface ListingLookup {
  address: string;
  city: string;
  state?: string;
  zip?: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  lat?: number;
  lng?: number;
  photoUrl?: string;
  sourceUrl: string;
  mls?: string;
  features?: string;
  status?: string;
  photoUrls?: string[];
}

const metaTag = (html: string, prop: string): string | undefined => {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`,
    "i",
  );
  return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? undefined;
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
  rsquo: "\u2019",
  lsquo: "\u2018",
  rdquo: "\u201d",
  ldquo: "\u201c",
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026",
  deg: "\u00b0",
};

// Listing feeds double-encode ("&amp;rsquo;"), so decode until it settles.
const decodeEntities = (input: string): string => {
  let out = input;
  for (let pass = 0; pass < 3; pass++) {
    const next = out
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
    if (next === out) break;
    out = next;
  }
  return out;
};

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 14000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export function photoUrlsForMls(mls: string, count = 6): string[] {
  const clean = mls.trim().replace(/[^A-Za-z0-9]/g, "");
  if (clean.length < 4) return [];
  const shard = clean.slice(-3);
  const urls: string[] = [
    `https://ssl.cdn-redfin.com/photo/45/bigphoto/${shard}/${clean}_0.jpg`,
  ];
  for (let n = 1; n < count; n++) {
    urls.push(
      `https://ssl.cdn-redfin.com/photo/45/bigphoto/${shard}/${clean}_${n}_0.jpg`,
    );
  }
  return urls;
}

// Any listing URL carries the address; these read it out.
export function addressFromListingUrl(
  url: string,
): { address: string; city: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname;
    if (host.includes("zillow.")) {
      const m =
        path.match(/\/homedetails\/([^/]+)\//i) ??
        path.match(/\/homes\/([^/]+?)_rb/i);
      if (!m) return null;
      const parts = m[1].split("-");
      const stateIdx = parts.findIndex((p) => /^[A-Z]{2}$/.test(p));
      if (stateIdx < 2) return null;
      const cityStart = Math.max(1, stateIdx - 2);
      return {
        address: parts.slice(0, cityStart).join(" "),
        city: parts.slice(cityStart, stateIdx).join(" "),
      };
    }
    // Redfin: /CA/Temecula/29907-Longvale-Ct-92592/home/6197060
    const m = path.match(/^\/[A-Z]{2}\/([^/]+)\/([^/]+?)-(\d{5})\/home\//i);
    if (m) {
      return {
        address: m[2].replace(/-/g, " "),
        city: m[1].replace(/-/g, " "),
      };
    }
    // Fall back to any "<street>-<City>-<ST>-<zip>" shaped segment.
    const seg = path.split("/").filter(Boolean).pop() ?? "";
    const parts = seg.split("-");
    const stateIdx = parts.findIndex((x) => /^[A-Z]{2}$/.test(x));
    if (stateIdx >= 2) {
      const cityStart = Math.max(1, stateIdx - 2);
      return {
        address: parts.slice(0, cityStart).join(" "),
        city: parts.slice(cityStart, stateIdx).join(" "),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// Listing pages describe themselves in their share tags, e.g.
// "(CRMLS) For Sale: 3 beds, 2 baths ∙ 2173 sq. ft. ∙ 29907 Longvale Ct,
//  Temecula, CA 92592 ∙ $735,000 ∙ MLS# SW26161992 ∙ SINGLE-STORY | ..."
function fromShareTags(html: string, url: string): ListingLookup | null {
  const title = decodeEntities(metaTag(html, "og:title") ?? "");
  const desc = decodeEntities(metaTag(html, "og:description") ?? "");
  const image = metaTag(html, "og:image") ?? metaTag(html, "twitter:image");
  const both = `${desc} ∙ ${title}`;

  const addrMatch =
    both.match(/∙\s*([^∙]+?),\s*([A-Za-z .'-]+),\s*([A-Z]{2})\s*(\d{5})/) ??
    both.match(/at\s+([^,]+),\s*([A-Za-z .'-]+),\s*([A-Z]{2})\s*(\d{5})/) ??
    title.match(/^([^,]+),\s*([A-Za-z .'-]+),\s*([A-Z]{2})\s*(\d{5})/);
  if (!addrMatch) return null;

  const priceStr = both.match(/\$([\d,]{4,})/)?.[1];
  const beds = both.match(/([\d.]+)\s*beds?/i)?.[1];
  const baths = both.match(/([\d.]+)\s*baths?/i)?.[1];
  const sqft = both.match(/([\d,]+)\s*sq\.?\s*ft/i)?.[1];
  const mls = both.match(/MLS#?\s*([A-Za-z0-9-]+)/i)?.[1];
  const soldFor = both.match(/sold for \$([\d,]+)/i)?.[1];

  // Whatever the listing agent wrote, after the MLS number.
  const blurb = desc.split(/MLS#?\s*[A-Za-z0-9-]+\s*∙\s*/i)[1];

  return {
    address: addrMatch[1].trim(),
    city: addrMatch[2].trim(),
    state: addrMatch[3],
    zip: addrMatch[4],
    price: Number((soldFor ?? priceStr ?? "").replace(/,/g, "")) || undefined,
    beds: beds ? Number(beds) : undefined,
    baths: baths ? Number(baths) : undefined,
    sqft: sqft ? Number(sqft.replace(/,/g, "")) : undefined,
    photoUrl: image && image.startsWith("http") ? image : undefined,
    sourceUrl: url,
    mls,
    features: blurb ? blurb.replace(/\.\.\.$/, "").trim().slice(0, 320) : undefined,
    status: /sold/i.test(both)
      ? "Sold"
      : /pending|contingent/i.test(both)
        ? "Pending"
        : /coming soon/i.test(both)
          ? "Pre On-Market"
          : "Active",
  };
}

// Zillow blocks server reads, but its URLs carry the address, and the MLS
// feed can find the same home — which also hands back a page we CAN read.
function addressFromZillowUrl(url: string): { address: string; city: string } | null {
  const m = url.match(/\/homedetails\/([^/]+)\//i) ?? url.match(/\/homes\/([^/]+?)_rb/i);
  if (!m) return null;
  const parts = m[1].split("-");
  const stateIdx = parts.findIndex((p) => /^[A-Z]{2}$/.test(p));
  if (stateIdx < 2) return null;
  // ...-<street words>-<City words>-<ST>-<zip>
  const cityStart = Math.max(1, stateIdx - 2);
  const street = parts.slice(0, cityStart).join(" ");
  const city = parts.slice(cityStart, stateIdx).join(" ");
  if (!street || !city) return null;
  return { address: street, city };
}

const normAddr = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

async function findInFeed(
  address: string,
  city: string,
): Promise<MarketHome | null> {
  const key = Object.keys(SEARCH_AREAS).find(
    (k) => SEARCH_AREAS[k].label.toLowerCase() === city.toLowerCase(),
  );
  for (const area of [key ?? "all", "all"]) {
    const res = await searchMarket({ area });
    const want = normAddr(address);
    const hit = res.homes.find((h) => {
      const have = normAddr(h.address);
      return have === want || have.startsWith(want) || want.startsWith(have);
    });
    if (hit) return hit;
    if (area === "all") break;
  }
  return null;
}

// Give it any listing link she has — Redfin, Zillow, an IDX page — and the
// desk comes back with the real home. The MLS feed leads because it answers
// reliably from the edge; the listing page is a bonus for the agent remarks.
export async function lookupListingByUrl(
  rawUrl: string,
): Promise<ListingLookup | null> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const parsed = addressFromListingUrl(url);
  let feedHit: MarketHome | null = null;
  if (parsed) feedHit = await findInFeed(parsed.address, parsed.city);

  // The page is worth a try for the listing agent's own write-up.
  const html = await fetchHtml(url);
  const fromPage = html ? fromShareTags(html, url) : null;

  if (!feedHit && !fromPage) return null;

  const address = fromPage?.address ?? feedHit?.address ?? parsed?.address ?? "";
  const city = fromPage?.city ?? feedHit?.city ?? parsed?.city ?? "";
  if (!address) return null;

  const mls = fromPage?.mls ?? feedHit?.mls;
  const photos = mls ? photoUrlsForMls(mls) : [];

  const featureBits = [
    feedHit?.propertyType,
    feedHit?.yearBuilt ? `built ${feedHit.yearBuilt}` : "",
    feedHit?.lotSqft
      ? `${feedHit.lotSqft.toLocaleString("en-US")} sqft lot`
      : "",
    feedHit?.hoa ? `HOA $${feedHit.hoa}/mo` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    address,
    city,
    state: fromPage?.state,
    zip: fromPage?.zip,
    price: fromPage?.price ?? feedHit?.price,
    beds: fromPage?.beds ?? feedHit?.beds,
    baths: fromPage?.baths ?? feedHit?.baths,
    sqft: fromPage?.sqft ?? feedHit?.sqft,
    yearBuilt: feedHit?.yearBuilt,
    lat: feedHit?.lat,
    lng: feedHit?.lng,
    photoUrl: fromPage?.photoUrl ?? photos[0],
    photoUrls: photos,
    sourceUrl: feedHit?.url ?? url,
    mls,
    features: fromPage?.features || featureBits || undefined,
    status: fromPage?.status ?? feedHit?.status,
  };
}

// Pull the listing's own photo so it lands in her storage, not hotlinked.
export async function fetchPhotoBytes(
  url: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 14000);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "image/*" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!/^image\/(jpeg|png|webp)/.test(contentType)) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 8_000_000 || buf.byteLength < 512) return null;
    return { bytes: new Uint8Array(buf), contentType };
  } catch {
    return null;
  }
}
