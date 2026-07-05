import { AgentTemplate } from "./types";

// The product catalog: purpose-built agents you deploy per client, then
// leave running on a monthly subscription.
export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "listing-walkthrough",
    name: "Listing Walkthrough Agent",
    vertical: "real-estate",
    tagline: "TikTok walkthrough videos + lead-gen marketing for realtors",
    description:
      "Turns a property listing into short-form video scripts (TikTok/Reels/Shorts), shot lists, captions, and hashtags. Runs the follow-up marketing: open-house promos, just-listed/just-sold posts, and lead-capture copy. Built around the 5-minute lead response window.",
    capabilities: [
      "Walkthrough video script generator (hook, room-by-room beats, CTA)",
      "Just-listed / just-sold social posts with local hashtags",
      "Open-house promo sequences (email + SMS)",
      "Lead responder drafts that reference the exact listing",
    ],
    monthlyPrice: 200,
  },
  {
    id: "solar-lead-nurture",
    name: "Solar Lead Nurture Agent",
    vertical: "solar",
    tagline: "Lead gen that knows exactly who it's talking to",
    description:
      "Captures project type (residential/commercial), roof details, utility bill range, and timeline, then nurtures each lead with context-aware follow-ups. Tells the rep who they're talking to and where to go next.",
    capabilities: [
      "Qualifying intake: project type, roof, bill range, timeline",
      "Context-aware follow-up sequences per lead segment",
      "Rep briefing: who the lead is, objections to expect, next step",
      "Appointment-setting copy tuned to incentive deadlines",
    ],
    monthlyPrice: 200,
  },
  {
    id: "brand-marketing",
    name: "Brand Marketing Agent",
    vertical: "clothing",
    tagline: "Drops, campaigns, and content for clothing brands",
    description:
      "Runs the marketing calendar for a clothing brand: product-drop campaigns, UGC-style content briefs, ad copy variants, and audience-segmented email flows.",
    capabilities: [
      "Product drop campaign plans (teaser → launch → restock)",
      "Ad copy + creative briefs per audience segment",
      "UGC and influencer outreach scripts",
      "Email/SMS flows: welcome, abandoned cart, VIP",
    ],
    monthlyPrice: 200,
  },
  {
    id: "home-services-intake",
    name: "Home Services Intake Agent",
    vertical: "home-services",
    tagline: "AI-powered urgency triage for HVAC & plumbing",
    description:
      "Intake form with AI urgency classification (emergency, same-day, scheduled). A 'scheduled' request that mentions a gas smell gets flagged Priority Emergency. Shareable result pages with urgency badge and full contact card.",
    capabilities: [
      "7-field intake with AI urgency classification",
      "Priority-emergency escalation on risk keywords",
      "Shareable lead result pages with contact card",
      "Dispatcher summaries: where to go, in what order",
    ],
    monthlyPrice: 200,
  },
  {
    id: "custom",
    name: "Custom Agent",
    vertical: "other",
    tagline: "Purpose-built for whatever the client needs",
    description:
      "Scoped from the client's use case using the same infrastructure: intake, content generation, lead nurture, and reporting blocks assembled to fit.",
    capabilities: ["Scoped per engagement"],
    monthlyPrice: 200,
  },
];

export function getTemplate(id: string) {
  return AGENT_TEMPLATES.find((t) => t.id === id);
}
