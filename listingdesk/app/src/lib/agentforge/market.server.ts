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
