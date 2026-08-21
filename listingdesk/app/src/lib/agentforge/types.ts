// Core domain model for ListingDesk: one real estate agent's personal command
// desk. Listings are staged, marketed with instant video walkthrough scripts,
// and driven from coming soon to sold.

export interface Owner {
  name: string;
  brokerage: string;
  dre: string;
  phone: string;
  serviceArea: string;
  photoUrl?: string;
}

export interface SocialPost {
  id: string;
  content: string;
  status: "draft" | "posted";
  createdAt: string;
  postedAt?: string;
}

export interface SocialPanel {
  handle: string;
  autoPost: boolean;
  posts: SocialPost[];
}

export interface EmailItem {
  id: string;
  to: string;
  subject: string;
  preview: string;
  sentAt: string;
  kind: "welcome" | "outreach";
}

export interface EmailPanel {
  address: string;
  sent: EmailItem[];
  received: number;
}

export interface SitePanel {
  url: string;
  domain: string;
  status: "live" | "building";
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  addedAt: string;
}

export interface AdCampaign {
  id: string;
  name: string;
  audience: string;
  dailyBudget: number;
  status: "draft" | "ready";
  createdAt: string;
}

export interface AdsPanel {
  campaigns: AdCampaign[];
}

export interface Billing {
  stripeEnabled: boolean;
  subscribed?: boolean;
}

export type ListingStatus = "coming-soon" | "active" | "pending" | "sold";

export const LISTING_STAGES: ListingStatus[] = [
  "coming-soon",
  "active",
  "pending",
  "sold",
];

export const STAGE_LABELS: Record<ListingStatus, string> = {
  "coming-soon": "coming soon",
  active: "active",
  pending: "pending",
  sold: "sold",
};

export interface Listing {
  id: string;
  address: string;
  city: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  features: string;
  status: ListingStatus;
  leadCount: number;
  walkthroughDocumentId?: string;
  sourceUrl?: string;
  // Cover image shown on the board (first uploaded photo when none is set).
  photoUrl?: string;
  // Her real photos of the home, uploaded from her phone or the MLS export.
  // The walkthrough video pipeline animates THESE when they exist.
  photos?: string[];
  // Map position (auto-filled from the city when she doesn't set one).
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt: string;
}

// Her own keys, stored server-side only and echoed back masked. The desk
// brain uses anthropicKey when set; the walkthrough video pipeline uses
// apifyToken for the Zillow scrape.
export type NotifyEvent =
  | "walkthrough"
  | "lead"
  | "campaign"
  | "task"
  | "followup"
  | "showing";

export const NOTIFY_EVENTS: { id: NotifyEvent; label: string }[] = [
  { id: "lead", label: "New lead comes in" },
  { id: "walkthrough", label: "Walkthrough script is ready" },
  { id: "campaign", label: "Campaign is drafted" },
  { id: "followup", label: "Follow-up sequence is filed" },
  { id: "task", label: "A task finishes" },
  { id: "showing", label: "Showing / open-house reminders" },
];

export interface Settings {
  anthropicKey?: string;
  apifyToken?: string;
  // SMS updates: agents text Leslie when these events fire. Real texts go out
  // when Twilio is connected; otherwise they queue to the message log.
  notifyPhone?: string;
  notifyPrefs?: NotifyEvent[];
  twilioSid?: string;
  twilioToken?: string;
  twilioFrom?: string;
}

export interface SmsMessage {
  id: string;
  to: string;
  body: string;
  event: NotifyEvent | "test";
  status: "sent" | "queued" | "failed";
  detail?: string;
  createdAt: string;
}

export type TaskStatus = "queued" | "in-progress" | "done";
export type TaskKind = "research" | "outreach" | "followup" | "content" | "ops";

export interface Task {
  id: string;
  title: string;
  description: string;
  kind: TaskKind;
  status: TaskStatus;
  tags: string[];
  listingId?: string;
  createdAt: string;
  completedAt?: string;
  outputDocumentId?: string;
}

export interface Document {
  id: string;
  title: string;
  kind:
    | "report"
    | "research"
    | "walkthrough"
    | "sequence"
    | "outreach"
    | "poster"
    | "guide"
    | "presentation"
    | "market";
  content: string;
  createdAt: string;
  listingId?: string;
  // Walkthrough marketing flow: pending until she approves it for marketing.
  approval?: "pending" | "approved";
  videoUrl?: string;
}

// A printable marketing poster (the flyer), copy written by the agent and
// rendered on its own branded page.
export interface Poster {
  id: string;
  listingId?: string;
  kind: "just-listed" | "open-house" | "did-you-know" | "just-sold";
  eyebrow: string;
  headline: string;
  bullets: string[];
  cta: string;
  createdAt: string;
}

/* Marketing studio ------------------------------------------------- */

export type ChannelId =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "youtube";

export const CHANNELS: { id: ChannelId; label: string }[] = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube Shorts" },
];

export interface Channel {
  id: ChannelId;
  handle: string;
  connected: boolean;
}

export interface CampaignPiece {
  id: string;
  channel: ChannelId;
  content: string;
  status: "draft" | "approved" | "posted";
  postedAt?: string;
}

export interface Campaign {
  id: string;
  listingId: string;
  ownerTake: string;
  channels: ChannelId[];
  pieces: CampaignPiece[];
  documentId?: string;
  createdAt: string;
}

export type LeadStage = "new" | "contacted" | "nurturing" | "client";

export const LEAD_STAGES: LeadStage[] = [
  "new",
  "contacted",
  "nurturing",
  "client",
];

export interface LeadContact {
  id: string;
  name: string;
  source: string;
  phone?: string;
  email?: string;
  listingId?: string;
  stage: LeadStage;
  notes?: string;
  followUpDocumentId?: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  message: string;
  createdAt: string;
  kind: "shipped" | "research" | "outreach" | "system" | "chat";
  rating?: "up" | "down";
}

export type IntegrationCategory = "crm" | "mls" | "marketing" | "comms";

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  connected: boolean;
  apiKey?: string;
  connectedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Metrics {
  leadsThisWeek: number;
  showings: number;
  walkthroughs: number;
  updatedAt: string;
}


/* Clients & buyers ------------------------------------------------- */

// Her buyer pipeline follows the Keller Williams home purchasing process
// from her listing presentation, so what she shows clients and what the
// desk tracks are the same steps.
export type ClientKind = "first-time" | "buyer" | "seller" | "past";

export const CLIENT_KINDS: { id: ClientKind; label: string }[] = [
  { id: "first-time", label: "First-time buyer" },
  { id: "buyer", label: "Buyer" },
  { id: "seller", label: "Seller" },
  { id: "past", label: "Past client" },
];

export type ClientStage =
  | "consult"
  | "preapproval"
  | "touring"
  | "offer"
  | "contingencies"
  | "closing"
  | "closed";

export const CLIENT_STAGES: {
  id: ClientStage;
  label: string;
  note: string;
}[] = [
  { id: "consult", label: "Buyer consult", note: "Analyze their needs and set the plan" },
  { id: "preapproval", label: "Preapproval", note: "Financial preapproval with a lender" },
  { id: "touring", label: "Touring homes", note: "Select and view properties" },
  { id: "offer", label: "Offer written", note: "Write the offer and negotiate terms" },
  { id: "contingencies", label: "Contingencies", note: "Inspections, financing, title" },
  { id: "closing", label: "Closing", note: "Funds to close and sign" },
  { id: "closed", label: "Keys in hand", note: "Took possession — stay in touch" },
];

// A home she saved for a client, either from the area search or by hand.
export interface SavedHome {
  id: string;
  address: string;
  city: string;
  price: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  url?: string;
  note?: string;
  savedAt: string;
}

export interface ClientTouch {
  id: string;
  note: string;
  at: string;
}

export interface Client {
  id: string;
  name: string;
  kind: ClientKind;
  stage: ClientStage;
  phone?: string;
  email?: string;
  budgetMin?: number;
  budgetMax?: number;
  cities?: string[];
  beds?: number;
  timeline?: string;
  preapproved?: boolean;
  lender?: string;
  source?: string;
  notes?: string;
  savedHomes: SavedHome[];
  touches: ClientTouch[];
  // When she owes them a call. Overdue rises to the top of the queue.
  nextFollowUp?: string;
  lastTouchAt?: string;
  guideDocumentId?: string;
  followUpDocumentId?: string;
  listingId?: string;
  createdAt: string;
}

// A live listing from the area search (the wider market, not her own book).
export interface MarketHome {
  id: string;
  address: string;
  city: string;
  price: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSqft?: number;
  yearBuilt?: number;
  propertyType?: string;
  status?: string;
  daysOnMarket?: number;
  pricePerSqft?: number;
  hoa?: number;
  lat?: number;
  lng?: number;
  url?: string;
  openHouse?: string;
  mls?: string;
}

export interface MarketStats {
  count: number;
  medianPrice: number;
  medianPpsf: number;
  medianDom: number;
  newThisWeek: number;
}

export interface DB {
  owner: Owner;
  social: SocialPanel;
  email: EmailPanel;
  site: SitePanel;
  team: TeamMember[];
  ads: AdsPanel;
  billing: Billing;
  listings: Listing[];
  channels: Channel[];
  campaigns: Campaign[];
  leads: LeadContact[];
  clients: Client[];
  posters: Poster[];
  messages: SmsMessage[];
  tasks: Task[];
  documents: Document[];
  activity: ActivityItem[];
  integrations: Integration[];
  chat: ChatMessage[];
  metrics: Metrics;
  settings: Settings;
}
