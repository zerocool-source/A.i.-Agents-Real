# AgentForge — Hire Your AI Employee

An AI-infrastructure dashboard for a one-person agency: deploy **purpose-built AI agents** for small-business clients in minutes, leave them running, and bill **$200/month per agent**.

Built around real client cases:

- **Antoine Freeman (Freeman Realty)** — realtor who wants marketing + lead gen with TikTok walkthrough videos for every listing
- **SunPeak Solar** — solar rep who needs lead gen that *knows who it's talking to* and tells him where to go next
- **Vellum & Co.** — clothing brand that wants drop campaigns, ad copy, and email flows

## What's in the dashboard

| Panel | What it does |
| --- | --- |
| **Tasks** | Queue research/outreach/content/feature tasks and hit **Run** — the agent brain (Claude) executes the task and files the deliverable under Documents |
| **Documents** | CEO reports, segment deep-dives, walkthrough scripts — everything the agents produce |
| **Clients & Agents** | Client roster with per-client deployed agents; deploy a new agent from a template in one modal |
| **Agent Templates** | Listing Walkthrough (real estate), Solar Lead Nurture, Brand Marketing (clothing), Home Services Intake |
| **Agent Feed** | Activity stream of what the agents shipped + "Ask AgentForge anything" chat |
| **CRM / ERP** | Connect client systems (Follow Up Boss, HubSpot, Salesforce, Zoho, Odoo, NetSuite, Twilio, Mailgun, Meta Ads) |
| **Business** | Visitors, revenue, MRR, active agents |

## Run it

```bash
npm install
cp .env.example .env   # add ANTHROPIC_API_KEY to enable the live agent brain
npm run dev
```

Open http://localhost:3000. Without an API key the app runs in **demo mode** — everything works, but task runs and chat return labeled placeholder output instead of live Claude output.

## Architecture

- **Next.js 15 (App Router) + TypeScript**, no CSS framework — the newspaper/brutalist aesthetic is ~300 lines of custom CSS
- **Agent brain**: `lib/claude.ts` — Anthropic SDK, `claude-opus-4-8` with adaptive thinking; every call gets a compact business-state context (`lib/context.ts`) and a cached system prompt
- **Data**: JSON file store at `data/db.json` (`lib/store.ts`), seeded from `lib/seed.ts` on first run. Delete the file to reset. Swap for Postgres when you need auth/multi-user.
- **API routes**: `app/api/{chat,tasks,clients,agents,integrations}` — plain REST, no client-side state library

## Roadmap

1. **Client-facing agent endpoints** — public intake/lead pages per deployed agent (e.g. `/solar-lead`) that feed captured leads back into the dashboard
2. **Real CRM sync** — the connectors page stores keys today; wire Follow Up Boss + HubSpot lead push first
3. **Stripe billing** — subscribe button → real $200/mo subscriptions per agent
4. **Scheduled agent runs** — nightly research + CEO report generation (cron)
5. **Auth + multi-tenant** — one dashboard per client, agency view on top
