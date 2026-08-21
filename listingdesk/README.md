# ListingDesk — Leslie Smith's personal real estate desk

The full source of **https://listingdesk.higgsfield.app**, kept here so the work
survives the ephemeral build container.

Persona: Leslie Smith · Keller Williams The Lakes · DRE #01988720 · 951-237-4991,
farming the Temecula valley (Temecula, Murrieta, Menifee, Lake Elsinore, Hemet,
San Jacinto, Perris, Moreno Valley, Winchester, Wildomar, Canyon Lake, Sun City).

## What it is

A TanStack Start (React 19) app on a single Cloudflare Worker. State is one JSON
document in D1 (`af_store`, key `listingdesk-v10`); listing photos live in R2 and
are served from `/photos/$photoId`.

### Pages

| Route | What it does |
| --- | --- |
| `/` | The desk: agent bar, hero, **live map** with priced pins and a house card open by default, money-on-the-market band, listings board with photo uploads, tasks, chat, activity |
| `/search` | **Area search** — every home for sale in her farm area, live from the Redfin MLS feed. Filter by city/price/beds/type, save homes to a client, add one to her board, or turn the numbers into a market post |
| `/clients` | **Clients & buyers** — follow-up queue, the Keller Williams home purchasing process, first-time buyer guides, follow-up scripts, saved homes, call log |
| `/studio` | Marketing studio: walkthrough studio, composer, poster maker, campaigns, SMS notifications, lead book |
| `/plan` | **Marketing plan** — every tool from her listing presentation with an honest status, the listing-presentation writer, week-by-week seller timeline |
| `/home/$listingId` | **Public single-property website** per listing: photos, walkthrough video, lead form that writes into her book and texts her |
| `/poster/$posterId` | Printable branded flyer with the house photo |
| `/docs`, `/docs/$docId` | Everything the desk has written |
| `/integrations` | API keys (Anthropic, Apify), connectors |

### Live data, not mocks

- **Area search** pulls the public Redfin CSV feed (same MLS her listings are on).
  The valley is fetched as three overlapping polygons in parallel and merged,
  deduped, then filtered to her farm cities. ~780 homes valley-wide.
  See `src/lib/agentforge/market.server.ts`.
- **Zillow** blocks server-side reads (PerimeterX), so the UI hands her a deep
  link that runs the same search there instead of faking results.

### Honest stubs (by design)

- **Brain**: demo mode until an Anthropic key is saved in the keys panel; her key
  is stored server-side in D1 and takes precedence over `ANTHROPIC_API_KEY`.
- **SMS**: queues to the message log with a visible status until Twilio creds are
  added, then texts her for real.
- **Social posting**: approve/post is local state until real channel accounts connect.

## Build

Verified from a clean copy of this directory (2026-08-21): `bun install`
succeeds, `vite build` emits `dist/server/server.js`, and `wrangler dev`
serves every route (`/`, `/search`, `/clients`, `/plan`, `/studio`,
`/home/$listingId`).

```bash
cd app
bun install          # or npm install
npx vite build       # tsc --noEmit && vite build
```

Run the worker locally (needs wrangler installed outside the app dir to avoid the
`@types/react` override conflict):

```bash
wrangler dev -c app/wrangler.jsonc --port 5199
```

Without D1/R2 bindings the store falls back to an in-memory seed, which is enough
to exercise every page.

## Deploying

The site is a Higgsfield-hosted app (`website_id a31573df-ac6a-4977-b024-e687790bc568`).
Deploying needs the Higgsfield website MCP tools:

1. `website_repo_access` → mints a scoped token + the git remote
2. push to that remote's `main`
3. `deploy_website` → builds from `main` and ships to the live URL

Those tools disconnected mid-session on 2026-08-19 and had not returned as of
2026-08-21 — the app repo answers 404 from two independent networks and the
scoped token is dead, so the deploy channel is unreachable from that session.
This directory is the complete, build-verified tree; a session with the
Higgsfield website tools can clone it, push, and deploy without any other
preparation.

## Testing

Wire-level UAT runs against the deployed (or local) Worker by calling the exact
server functions the buttons call. 118/118 checks passing across seven rounds —
see the UAT report delivered in chat.

## Assets

`app/public/assets/*-walkthrough.mp4` are the three cinematic walkthrough videos
generated on Higgsfield credits (Sagecrest, Juniper Bend, Lakeshore). They are
kept in git because regenerating them costs credits.
