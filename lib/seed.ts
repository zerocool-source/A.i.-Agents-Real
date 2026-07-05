import { DB } from "./types";

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);

// Seeded with the founder's real pipeline: a realtor who wants TikTok
// walkthrough videos, a solar rep who needs lead gen that knows who it's
// talking to, and a clothing brand owner.
export function buildSeed(): DB {
  return {
    clients: [
      {
        id: "cl-antoine",
        name: "Antoine Freeman",
        company: "Freeman Realty Group",
        vertical: "real-estate",
        email: "antoine@freemanrealty.example",
        subscriptionStatus: "active",
        mrr: 200,
        createdAt: daysAgo(12),
        notes:
          "Wants marketing + lead generation with TikTok walkthrough videos for every new listing. Fastest to close when leads are answered within 5 minutes.",
      },
      {
        id: "cl-solar",
        name: "Marcus Delgado",
        company: "SunPeak Solar",
        vertical: "solar",
        email: "marcus@sunpeak.example",
        subscriptionStatus: "trial",
        mrr: 0,
        createdAt: daysAgo(5),
        notes:
          "Sells residential solar. Needs lead gen that knows who it's talking to — project type, roof, bill range — and tells him where to go next.",
      },
      {
        id: "cl-clothing",
        name: "Deja Williams",
        company: "Vellum & Co. Apparel",
        vertical: "clothing",
        email: "deja@vellumco.example",
        subscriptionStatus: "trial",
        mrr: 0,
        createdAt: daysAgo(2),
        notes:
          "Streetwear brand, drops monthly. Wants campaign content, ad copy, and email flows for each drop.",
      },
    ],
    agents: [
      {
        id: "ag-walkthrough",
        clientId: "cl-antoine",
        templateId: "listing-walkthrough",
        name: "Freeman Walkthrough Agent",
        status: "deployed",
        deployedAt: daysAgo(10),
        monthlyPrice: 200,
        config: {
          businessName: "Freeman Realty Group",
          audience: "First-time buyers and relocations in the metro area",
          goals:
            "A TikTok walkthrough script within an hour of every new listing; respond to every portal lead within 5 minutes.",
        },
        stats: { tasksCompleted: 14, leadsCaptured: 23 },
      },
      {
        id: "ag-solar",
        clientId: "cl-solar",
        templateId: "solar-lead-nurture",
        name: "SunPeak Lead Nurture Agent",
        status: "building",
        deployedAt: daysAgo(1),
        monthlyPrice: 200,
        config: {
          businessName: "SunPeak Solar",
          audience: "Homeowners with $150+/mo utility bills",
          goals:
            "Qualify every inbound lead (project type, roof details, timeline) and brief Marcus on who he's talking to before each call.",
        },
        stats: { tasksCompleted: 2, leadsCaptured: 6 },
      },
    ],
    tasks: [
      {
        id: "t-outreach",
        title: "Draft cold outreach sequence and Facebook ad targeting",
        description:
          "Using the community map (150K+ Facebook Group members, r/realestateagents 180K, Inman Connect Slack), draft a 3-email cold outreach sequence and Facebook ad targeting spec for the realtor segment.",
        kind: "outreach",
        status: "queued",
        tags: ["OUTREACH", "TONIGHT"],
        createdAt: hoursAgo(6),
      },
      {
        id: "t-audit",
        title: "Audit competitor AI tools in Real Estate and Home Services",
        description:
          "The top 2 segments identified in the community map are Real Estate Agents and Home Services (HVAC/Plumbing). Research the specific AI automation tools they already pay for, pricing, and the gaps a $200/mo purpose-built agent can exploit.",
        kind: "research",
        status: "queued",
        tags: ["RESEARCH"],
        createdAt: hoursAgo(9),
      },
      {
        id: "t-solar-agent",
        title: "Build solar lead nurture agent",
        description:
          "Build a solar installer lead nurture agent at /solar-lead. Capture project type (residential/commercial), roof details, timeline, and contact info — qualify and hand off with a rep briefing.",
        kind: "feature",
        status: "in-progress",
        tags: ["FEATURE"],
        clientId: "cl-solar",
        createdAt: hoursAgo(20),
      },
      {
        id: "t-antoine-listing",
        title: "Walkthrough script — 4BR colonial on Maple St",
        description:
          "Antoine has a new listing: 4BR/2.5BA colonial, renovated kitchen, half-acre lot, $485k. Generate the TikTok walkthrough script, caption, and hashtag set.",
        kind: "content",
        status: "done",
        tags: ["CONTENT", "REAL-ESTATE"],
        clientId: "cl-antoine",
        createdAt: daysAgo(1.2),
        completedAt: daysAgo(1),
        outputDocumentId: "doc-walkthrough-maple",
      },
    ],
    documents: [
      {
        id: "doc-ceo-day2",
        title: "Day 2 — CEO Report",
        kind: "report",
        createdAt: hoursAgo(19),
        content: `# Day 2 — CEO Report

## Where we are
- **AgentForge thesis holding:** small businesses keep needing AI (real estate video, solar leads, clothing marketing) and every option they have takes months or costs a fortune. Purpose-built agents in minutes, $200/mo, no engineers.
- 3 clients in pipeline: Freeman Realty (active, $200 MRR), SunPeak Solar (trial), Vellum & Co. (trial).

## What shipped
- Freeman Walkthrough Agent live — 14 tasks completed, 23 leads captured.
- Solar lead nurture agent in build; intake spec locked.

## What's next
1. Finish SunPeak agent and convert trial → $200/mo.
2. Cold outreach sequence into realtor Facebook groups (150K+ members mapped).
3. Competitor audit in Real Estate + Home Services to sharpen positioning.

## Risks
- Single-founder delivery bottleneck → templates must stay reusable.
- Trials that never activate — every trial needs a shipped deliverable in week 1.`,
      },
      {
        id: "doc-re-deepdive",
        title: "Real Estate Agent Segment Deep-Dive: Tech Stack, Budgets & Objection Handlers",
        kind: "research",
        createdAt: hoursAgo(20),
        content: `# Real Estate Agent Segment Deep-Dive

## Spend
Agents spend **$500–$1,200/month** on tech (CRM, dialers, portals, ISAs). ISA replacement is the pricing anchor — a human ISA costs $1,500–$3,000/mo.

## Core hook
The **5-minute lead response window**: conversion drops ~8x after 5 minutes. Most solo agents respond in hours.

## Stack they already pay for
- CRM: Follow Up Boss, kvCORE, LionDesk
- Leads: Zillow Premier, Realtor.com Connections
- Marketing: Canva, occasional VA

## Objections & handlers
- *"I already have a CRM"* → We plug into it; the agent is the ISA on top.
- *"AI sounds generic"* → Every script references the exact listing.
- *"$200 is a lot"* → It's 1/10th of an ISA and answers in 5 seconds, not 5 hours.`,
      },
      {
        id: "doc-re-brief",
        title: "Real Estate Agents: Sales/Automation Target Segment Deep Research Brief",
        kind: "brief",
        createdAt: hoursAgo(20),
        content: `# Target Segment Brief — Real Estate Agents

- **1.2M solo agents** in the US; $200/mo checks out against ISA replacement.
- Communities mapped: 150K+ across Facebook groups, r/realestateagents (180K), Inman Connect Slack.
- Wedge: listing walkthrough videos (TikTok) — high visible value, easy demo.
- Expansion: lead response agent → full ISA replacement → team plans.`,
      },
      {
        id: "doc-walkthrough-maple",
        title: "TikTok Walkthrough Script — 4BR Colonial, Maple St ($485k)",
        kind: "script",
        clientId: "cl-antoine",
        createdAt: daysAgo(1),
        content: `# Walkthrough Script — 12 Maple St

**Hook (0-3s):** "This $485k colonial has the one kitchen feature every buyer asks me for — wait for it."

**Beats:**
1. Front exterior — half-acre lot line pan. "Half an acre, 12 minutes from downtown."
2. Kitchen — slow push to the island. "Fully renovated. Quartz, double oven, and THAT pot filler."
3. Primary suite — "4 bedrooms up, and this one has the walk-in you were promised."
4. Backyard — "Room for the pool. Yes, it's zoned for it."

**CTA:** "Open house Saturday 1–3. Comment MAPLE and I'll send the private tour link."

**Caption:** Renovated 4BR colonial on a half acre — $485k. Open house Sat. #realestate #housetour #newlisting #colonialhome #firsttimehomebuyer

**Post at:** 11am or 7pm local.`,
      },
    ],
    activity: [
      {
        id: "act-1",
        kind: "research",
        createdAt: hoursAgo(21),
        message:
          "Done with Day 1 — mapped 5 segments across 15+ communities. Real estate agents came out on top (1.2M solo agents, $200/month checks out), and that 5-minute lead response window is the core hook. Full breakdown saved to Documents.",
      },
      {
        id: "act-2",
        kind: "shipped",
        createdAt: hoursAgo(19),
        message:
          "Finished the real estate deep-dive — agents spending $500–$1,200/month on tech, so ISA replacement is your pricing anchor. Walkthrough script generator is out the door for Freeman Realty.",
      },
      {
        id: "act-3",
        kind: "shipped",
        createdAt: hoursAgo(4),
        message:
          "Solar intake spec is locked — 7-field form with AI urgency and segment classification, rep briefing on every qualified lead. Same ISA-replacement pattern as the walkthrough agent, so you can run both verticals side by side as a demo.",
      },
    ],
    integrations: [
      {
        id: "int-followupboss",
        name: "Follow Up Boss",
        category: "crm",
        description: "Real-estate CRM — sync leads and agent activity both ways.",
        connected: false,
      },
      {
        id: "int-hubspot",
        name: "HubSpot",
        category: "crm",
        description: "General CRM — contacts, deals, and marketing events.",
        connected: false,
      },
      {
        id: "int-salesforce",
        name: "Salesforce",
        category: "crm",
        description: "Enterprise CRM — push qualified leads into client orgs.",
        connected: false,
      },
      {
        id: "int-zoho",
        name: "Zoho CRM / Books",
        category: "erp",
        description: "CRM + light ERP — invoices, subscriptions, and contacts.",
        connected: false,
      },
      {
        id: "int-odoo",
        name: "Odoo",
        category: "erp",
        description: "Open-source ERP — orders, inventory, invoicing for product clients.",
        connected: false,
      },
      {
        id: "int-netsuite",
        name: "NetSuite",
        category: "erp",
        description: "ERP for bigger clients — financials and order management.",
        connected: false,
      },
      {
        id: "int-mailgun",
        name: "Mailgun",
        category: "comms",
        description: "Transactional + outreach email sending for agent sequences.",
        connected: false,
      },
      {
        id: "int-twilio",
        name: "Twilio",
        category: "comms",
        description: "SMS follow-ups and lead-response texts.",
        connected: false,
      },
      {
        id: "int-meta",
        name: "Meta Ads",
        category: "marketing",
        description: "Run the Facebook/Instagram ad sets the agents draft.",
        connected: false,
      },
    ],
    chat: [],
    metrics: {
      visitors: 4,
      revenue: 0,
      mrr: 200,
      activeAgents: 2,
      updatedAt: new Date(now).toISOString(),
    },
  };
}
