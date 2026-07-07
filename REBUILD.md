# AgentForge — Rebuild Prompt

Paste everything below the line into any capable AI coding agent to rebuild
this product from scratch. It captures the full spec: product, features, data
model, copy voice, and the design system. A variant section at the bottom
swaps the vertical (solar edition).

---

## The prompt

Build me a full-stack web app called **AgentForge**: a personal command
dashboard for one person who runs an AI-agent agency. Deploy it as a real
website with a server-rendered frontend, a backend, and a persistent
database. This is a PERSONAL desk, one owner per deployment: greet the owner,
write every line of copy in second person ("your agents", "your clients",
"your desk").

### The business it runs

The owner deploys purpose-built AI agents for small-business clients and
bills $200/month per agent. Current verticals: real-estate listing
walkthrough videos + lead gen, solar lead nurture, clothing-brand marketing,
and home-services intake. The dashboard is both their daily tool and the
demo they show prospects.

### Features

1. **Header band (hero):** personal greeting ("Your agents, on shift"), a
   short second-person lede, a MANAGE PLAN band ($200/mo per agent, cancel
   anytime), and live mono readouts: MRR, active agents, clients, visitors.
2. **Task queue:** the owner queues tasks (research / outreach / content /
   feature / ops, optional client attachment) and presses RUN. An AI agent
   executes the task server-side and files the finished deliverable as a
   markdown document. Show queued/in-progress states; tag chips per task.
3. **Client roster:** cards with a monogram tile, contact + vertical,
   subscription chip ($200/MO or TRIAL), the client's notes, and one gauge
   row per deployed agent (status chip + 5-segment lead meter + lead count).
   A "Deploy agent" action opens a modal with agent templates:
   - Listing Walkthrough Agent (real estate: TikTok walkthrough scripts,
     just-listed posts, open-house sequences, 5-minute lead response)
   - Solar Lead Nurture Agent (qualifying intake: project type, roof, bill
     range, timeline; rep briefings: who the lead is, objections, next step)
   - Brand Marketing Agent (drop campaigns, ad copy, UGC briefs, email flows)
   - Home Services Intake Agent (7-field intake, AI urgency classification,
     priority-emergency escalation on risk keywords)
4. **Wire log + console:** a live activity feed of what the agents shipped,
   plus a chat input ("Ask your agents anything"). Chat answers come from
   Claude with the full business state (clients, agents, open tasks,
   documents, metrics) injected as context.
5. **Documents archive:** numbered index (001, 002 ...) with kind chips and
   timestamps; a reader page renders each document's markdown. Task runs
   file their deliverables here automatically.
6. **Integrations page:** CRM / ERP / Marketing / Comms connectors (Follow
   Up Boss, HubSpot, Salesforce, Zoho, Odoo, NetSuite, Meta Ads, Mailgun,
   Twilio) with flip-switch connect controls. API keys are stored
   server-side only and echoed back masked (last 4 characters).

### AI agent brain

- Model: `claude-opus-4-8` via the Anthropic API, adaptive thinking, with a
  cached system prompt describing the business.
- Two calls: chat answers (short) and task execution ("produce the actual
  deliverable as markdown, do not describe what you would do").
- **Demo mode is mandatory:** with no `ANTHROPIC_API_KEY` set, chat and task
  runs return clearly-labeled placeholder output so the whole dashboard
  stays explorable. Handle refusal/error responses gracefully.

### Data model (persist all of it)

owner {name} · clients {name, company, vertical, email, subscriptionStatus
active|trial|churned, mrr, notes} · agents {clientId, templateId, name,
status deployed|building|paused, monthlyPrice, config {businessName,
audience, goals}, stats {tasksCompleted, leadsCaptured}} · tasks {title,
description, kind, status queued|in-progress|done, tags, clientId?,
outputDocumentId?} · documents {title, kind report|research|brief|script|
outreach, markdown content, clientId?} · activity {message, kind} · chat
{role, content} · integrations {name, category crm|erp|marketing|comms,
description, connected, apiKey?} · metrics {visitors, revenue, mrr,
activeAgents}

### Seed data (so the demo tells a story)

- Clients: Antoine Freeman / Freeman Realty Group (real estate, ACTIVE
  $200/mo, wants TikTok walkthrough videos for every listing, 5-minute lead
  response); Marcus Delgado / SunPeak Solar (trial, needs lead gen that
  knows who it's talking to); Deja Williams / Vellum & Co. Apparel
  (streetwear brand, trial, monthly drops).
- Agents: Freeman Walkthrough Agent (deployed, 23 leads), SunPeak Lead
  Nurture Agent (building, 6 leads).
- Tasks: cold outreach sequence + Facebook ad targeting (queued), competitor
  AI tool audit in real estate and home services (queued), build solar lead
  nurture agent (in progress).
- Documents: a Day 2 CEO report, a real-estate segment deep-dive (agents
  spend $500 to $1,200/month on tech; ISA replacement is the pricing
  anchor), a target-segment brief (1.2M solo agents), and a finished TikTok
  walkthrough script for a 4BR colonial at $485k.
- Wire log: three entries narrating the research and shipping progress.

### Design system: "Drafting Room"

Concept spine: **the precision instrument.** The dashboard is a calibrated
control desk; every panel reads like a gauge, running a task is pressing a
machined control. Register: confident engineering, a drafting room where AI
workers are specified, built, and shipped for you overnight.

- **Palette (locked):** chalk ground `#EFEDE6`, drafting panel `#E4E2D8`,
  card `#F7F6F0`, ink `#14151A`, hairline `#C6C4B8`, and ONE accent:
  cobalt `#2436C7` (signal color for actions, live states, the brand mark).
  Subtle 56px drafting-grid lines on the page background.
- **Type:** Satoshi (display + body, weights 400/500/700/900, self-hosted)
  and JetBrains Mono (all data, labels, readouts, uppercase micro-labels
  with wide tracking). No serif anywhere.
- **Corners/borders:** all-soft 10-14px radii, hairline borders, low smoke
  shadows. Never hard offset shadows.
- **Brand mark:** a flat cobalt anvil silhouette with a spark notch cut from
  the top; use as nav tile, favicon, and on the OG card.
- **Imagery (generate, palette-locked):** a machined precision instrument
  with a cobalt dial resting on cobalt blueprint paper (hero, right side of
  the header band); a second instrument shot for the integrations page; a
  cobalt paper texture plate behind the wire log. No stock photos.
- **Signature micro-interaction (Tier-1, micro dose):** the hero image is a
  two-layer parallax (plate + subject) that subtly follows the cursor;
  transform-only, rAF-batched, fully disabled under prefers-reduced-motion.
- **Bespoke CTAs (each control has its OWN garment, no shared button
  style):** RUN = cobalt corner-brackets that close around the label on
  hover, scale-down on press · MANAGE PLAN = full-width ink band that shifts
  to cobalt on hover · SEND = mono chip on the dark console that stretches
  its letter-spacing on hover · Deploy agent = cobalt text link whose
  diamond node travels along a drawn circuit wire on hover · Connect =
  physical flip switch · New task/client = oversized rotating plus glyph
  with a mono caption.
- **Wire log:** deep-cobalt rounded rail (the texture plate as background),
  translucent entry panels, mono timestamps, a LIVE chip, and a dark
  `>_` console input at the bottom.
- **Copy rules:** no em-dashes anywhere visible, headlines 8 words max, one
  eyebrow per 3 sections, plain functional copy over cute copy.
- Mobile: single column, hero visual stacks on top, hide the nav subtitle.

### Quality bar

- Server-rendered, SSR-safe (no window access during render).
- Interactive states: loading (blinking ellipsis), empty queue message,
  masked keys, hover/active feedback on every control.
- Verify the deployed site end-to-end before calling it done: run a task,
  send a chat message, connect an integration, open a document.

---

## Variant: SunDesk (solar edition)

Same build, swap the framing:

- Product name **SunDesk**; the owner is one solar sales rep.
- Replace the client roster with a **lead board**: each lead has project
  type (residential/commercial), roof details, average utility bill range,
  timeline, contact info, and a status meter from "new" to "appointment
  set".
- Replace agent templates with solar plays: qualifying intake, rep briefing
  generator ("who you're talking to, objections to expect, next step"),
  follow-up sequence writer, appointment setter tuned to incentive
  deadlines.
- Readouts: leads this week, appointments set, close rate, pipeline value.
- Seed: 4 leads across residential and commercial, 2 completed briefings,
  and a research doc on the 5-minute lead response window in solar.
- Redesign the brand from solar's material world (glass, silicon, daylight,
  rooftops) with ONE decisive accent. Do not reuse the cobalt+chalk palette,
  and avoid the cliched dark-dashboard-with-orange-glow look and generic AI
  palettes.
