// ListingDesk API layer: TanStack Start server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { askBrain, brainIsLive, runTaskBrain } from "./claude.server";
import { businessContext } from "./context";
import {
  SEARCH_AREAS,
  fetchPhotoBytes,
  lookupListingByUrl,
  searchMarket,
} from "./market.server";
import { notify, twilioReady } from "./sms.server";
import { bindings } from "../bindings.server";
import { readDB, updateDB, uid } from "./store.server";
import type {
  ActivityItem,
  Client,
  AdCampaign,
  Campaign,
  CampaignPiece,
  ChannelId,
  ChatMessage,
  Document,
  EmailItem,
  Integration,
  LeadContact,
  LeadStage,
  Listing,
  ListingStatus,
  NotifyEvent,
  Poster,
  SocialPost,
  Task,
  TaskKind,
  TaskStatus,
  TeamMember,
} from "./types";
import { CHANNELS, CLIENT_STAGES } from "./types";

function maskedKey(key?: string): string | undefined {
  if (!key) return undefined;
  return key.length <= 4 ? "****" : `••••${key.slice(-4)}`;
}

function publicIntegration(i: Integration): Integration {
  return { ...i, apiKey: maskedKey(i.apiKey) };
}

// Approximate centers of her farm-area cities, so anything she adds or
// imports lands on the map automatically. A small deterministic jitter keeps
// two homes in the same city from stacking on one point.
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  temecula: { lat: 33.4936, lng: -117.1484 },
  murrieta: { lat: 33.5539, lng: -117.2139 },
  wildomar: { lat: 33.5989, lng: -117.28 },
  "lake elsinore": { lat: 33.6681, lng: -117.3273 },
  menifee: { lat: 33.6971, lng: -117.185 },
  winchester: { lat: 33.707, lng: -117.0845 },
  hemet: { lat: 33.7476, lng: -116.972 },
  "san jacinto": { lat: 33.7839, lng: -116.9586 },
  perris: { lat: 33.7825, lng: -117.2286 },
  "moreno valley": { lat: 33.9425, lng: -117.2297 },
  "canyon lake": { lat: 33.685, lng: -117.2726 },
  "sun city": { lat: 33.7092, lng: -117.1973 },
};

function geoForCity(city: string, seedKey: string): { lat?: number; lng?: number } {
  const c = CITY_COORDS[city.trim().toLowerCase()];
  if (!c) return {};
  // Deterministic jitter (about a mile) from the id so pins don't stack.
  let h = 0;
  for (const ch of seedKey) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const jLat = ((h % 21) - 10) / 700;
  const jLng = (((h * 7) % 21) - 10) / 700;
  return { lat: c.lat + jLat, lng: c.lng + jLng };
}


export const getDashboard = createServerFn({ method: "GET" }).handler(
  async () => {
    const db = await readDB();
    return {
      owner: db.owner,
      social: db.social,
      email: db.email,
      site: db.site,
      team: db.team,
      ads: db.ads,
      billing: db.billing,
      listings: db.listings,
      campaigns: db.campaigns,
      leads: db.leads,
      posters: db.posters,
      tasks: db.tasks,
      documents: db.documents.map((d) => ({ ...d, content: "" })),
      activity: db.activity,
      chat: db.chat,
      metrics: db.metrics,
    };
  },
);

export const getStudio = createServerFn({ method: "GET" }).handler(
  async () => {
    const db = await readDB();
    const s = db.settings ?? {};
    return {
      owner: db.owner,
      listings: db.listings,
      channels: db.channels,
      campaigns: db.campaigns,
      leads: db.leads,
      posters: db.posters,
      team: db.team,
      messages: db.messages,
      notify: {
        phone: s.notifyPhone ?? "",
        prefs: s.notifyPrefs ?? [],
        twilioConnected: twilioReady(s),
        twilioFrom: s.twilioFrom ?? "",
      },
      documents: db.documents.map((d) => ({ ...d, content: "" })),
    };
  },
);

export const getDocuments = createServerFn({ method: "GET" }).handler(
  async () => {
    const db = await readDB();
    return { documents: db.documents, listings: db.listings };
  },
);

export const getDocument = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const db = await readDB();
    const doc = db.documents.find((d) => d.id === data.id) ?? null;
    const listing = doc?.listingId
      ? (db.listings.find((l) => l.id === doc.listingId) ?? null)
      : null;
    return { doc, listing };
  });

export const getIntegrations = createServerFn({ method: "GET" }).handler(
  async () => {
    const db = await readDB();
    const st = db.settings ?? {};
    return {
      integrations: db.integrations.map(publicIntegration),
      keys: {
        anthropic: maskedKey(st.anthropicKey),
        apify: maskedKey(st.apifyToken),
        brainLive: brainIsLive(st.anthropicKey),
      },
    };
  },
);

export const sendChat = createServerFn({ method: "POST" })
  .inputValidator(z.object({ message: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = await readDB();
    const answer = await askBrain(
      data.message.trim(),
      businessContext(db),
      db.settings?.anthropicKey,
    );
    const userMsg: ChatMessage = {
      id: uid("msg"),
      role: "user",
      content: data.message.trim(),
      createdAt: new Date().toISOString(),
    };
    const assistantMsg: ChatMessage = {
      id: uid("msg"),
      role: "assistant",
      content: answer,
      createdAt: new Date().toISOString(),
    };
    await updateDB((d) => {
      d.chat.push(userMsg, assistantMsg);
      if (d.chat.length > 200) d.chat = d.chat.slice(-200);
    });
    return { messages: [userMsg, assistantMsg] };
  });

export const createTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      kind: z
        .enum(["research", "outreach", "followup", "content", "ops"])
        .optional(),
      listingId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const kind = (data.kind ?? "ops") as TaskKind;
    const task: Task = {
      id: uid("t"),
      title: data.title.trim(),
      description: data.description?.trim() ?? "",
      kind,
      status: "queued",
      tags: [kind.toUpperCase()],
      listingId: data.listingId || undefined,
      createdAt: new Date().toISOString(),
    };
    await updateDB((db) => {
      db.tasks.unshift(task);
    });
    return { task };
  });

export const runTask = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const db = await readDB();
    const task = db.tasks.find((t) => t.id === data.id);
    if (!task) return { error: "task not found" as const };

    const content = await runTaskBrain(
      task.title,
      task.description,
      businessContext(db),
      db.settings?.anthropicKey,
    );
    const doc: Document = {
      id: uid("doc"),
      title: task.title,
      kind: task.kind === "research" ? "research" : "sequence",
      content,
      createdAt: new Date().toISOString(),
      listingId: task.listingId,
    };
    const activity: ActivityItem = {
      id: uid("act"),
      kind: "shipped",
      createdAt: new Date().toISOString(),
      message: `Task complete: "${task.title}". Deliverable filed under Documents.`,
    };
    await updateDB(async (d) => {
      const t = d.tasks.find((x) => x.id === data.id);
      if (t) {
        t.status = "done";
        t.completedAt = new Date().toISOString();
        t.outputDocumentId = doc.id;
      }
      d.documents.unshift(doc);
      d.activity.push(activity);
      await notify(
        d,
        "task",
        `ListingDesk: task done. "${task.title}" is filed under Documents.`,
      );
    });
    return { documentId: doc.id };
  });

export const setTaskStatus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      status: z.enum(["queued", "in-progress", "done"]),
    }),
  )
  .handler(async ({ data }) => {
    await updateDB((d) => {
      const t = d.tasks.find((x) => x.id === data.id);
      if (t) {
        t.status = data.status as TaskStatus;
        if (data.status === "done") t.completedAt = new Date().toISOString();
      }
    });
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Listing board                                                       */

export const createListing = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      address: z.string().min(1),
      city: z.string().min(1),
      price: z.number().positive(),
      beds: z.number().min(0).optional(),
      baths: z.number().min(0).optional(),
      sqft: z.number().min(0).optional(),
      features: z.string().optional(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const id = uid("ls");
    const geo = geoForCity(data.city, id);
    const listing: Listing = {
      id,
      address: data.address.trim(),
      city: data.city.trim(),
      price: data.price,
      lat: geo.lat,
      lng: geo.lng,
      beds: data.beds ?? 3,
      baths: data.baths ?? 2,
      sqft: data.sqft ?? 1500,
      features: data.features?.trim() || "To be staged",
      status: "coming-soon",
      leadCount: 0,
      notes: data.notes?.trim(),
      createdAt: new Date().toISOString(),
    };
    await updateDB((db) => {
      db.listings.unshift(listing);
      db.activity.push({
        id: uid("act"),
        kind: "system",
        createdAt: new Date().toISOString(),
        message: `${listing.address} staged as coming soon. Generate the walkthrough so the video drops with the listing.`,
      });
    });
    return { listing };
  });

export const setListingStatus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      status: z.enum(["coming-soon", "active", "pending", "sold"]),
    }),
  )
  .handler(async ({ data }) => {
    await updateDB((d) => {
      const l = d.listings.find((x) => x.id === data.id);
      if (!l) return;
      const was = l.status;
      l.status = data.status as ListingStatus;
      if (data.status === "sold" && was !== "sold") {
        d.activity.push({
          id: uid("act"),
          kind: "shipped",
          createdAt: new Date().toISOString(),
          message: `${l.address} closed. Queue the sold post and ask for the review while it is warm.`,
        });
      }
    });
    return { ok: true };
  });

// The signature action: instantly produce the full vertical-video walkthrough
// package for a listing and file it under Documents.
export const generateWalkthrough = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const db = await readDB();
    const listing = db.listings.find((l) => l.id === data.id);
    if (!listing) return { error: "listing not found" as const };

    const content = await runTaskBrain(
      `Walkthrough: ${listing.address}`,
      `Write a COMPLETE, LONG-FORM vertical video walkthrough package for this listing: ${listing.beds} bed, ${listing.baths} bath, ${listing.sqft} sqft at ${listing.address}, ${listing.city}, priced $${listing.price.toLocaleString()}. Key features: ${listing.features}.${listing.notes ? ` Notes: ${listing.notes}.` : ""}

This is a full property tour, not a teaser. Target 90 to 150 seconds of runtime.

Sections:
1) Hook (first 3 seconds: the spoken line plus on-screen text).
2) Shot list: 12 to 18 shots that walk the whole home in a natural order (approach and exterior, entry, great room, kitchen, dining, primary suite, primary bath, secondary bedrooms, bonus/office, laundry, garage, backyard, and any standout features). For EACH shot give: the room/location, the camera move (push in, orbit, reveal, tilt up, walking follow), the duration in seconds, and the exact spoken line. Durations should add up to 90 to 150 seconds.
3) B-roll and detail shots: 3 to 5 close-ups worth grabbing (hardware, finishes, view, light).
4) Caption rules: the on-screen text per shot, five words max each.
5) Music and pacing note: one line on tempo and where to cut.
6) Post copy with hashtags for TikTok and Instagram.
7) A shorter 30-second cutdown: which shot numbers to keep for a quick teaser version.
8) CTA that converts comments into showing requests.

Filmable in one or two passes on a phone with a gimbal. Be specific to THIS home's features.${listing.photos?.length ? ` Leslie has uploaded ${listing.photos.length} real photos of this home; write the shot list to match rooms a listing shoot would cover, since the video pipeline animates her real photos.` : ""}`,
      businessContext(db),
      db.settings?.anthropicKey,
    );
    const newId = uid("doc");
    let documentId = newId;
    await updateDB(async (d) => {
      const l = d.listings.find((x) => x.id === data.id);
      const prior = listing.walkthroughDocumentId
        ? d.documents.find((x) => x.id === listing.walkthroughDocumentId)
        : undefined;
      const now = new Date().toISOString();
      if (prior) {
        // Regenerate in place: same document, fresh script, approval reset
        // so she re-approves before it markets. A filmed video stays put,
        // and the walkthrough count doesn't inflate on rewrites.
        prior.title = `Walkthrough: ${listing.address}`;
        prior.content = content;
        prior.createdAt = now;
        delete prior.approval;
        documentId = prior.id;
        if (l) l.walkthroughDocumentId = prior.id;
      } else {
        d.documents.unshift({
          id: newId,
          title: `Walkthrough: ${listing.address}`,
          kind: "walkthrough",
          content,
          createdAt: now,
          listingId: listing.id,
        });
        if (l) l.walkthroughDocumentId = newId;
        d.metrics.walkthroughs += 1;
      }
      d.activity.push({
        id: uid("act"),
        kind: "shipped",
        createdAt: now,
        message: `Walkthrough script ${prior ? "refreshed" : "filed"} for ${listing.address}. Full property tour, 90 to 150 seconds. Film it and post the same day.`,
      });
      await notify(
        d,
        "walkthrough",
        `ListingDesk: your walkthrough script for ${listing.address} is ready. Full tour, ready to film. Open the desk to review.`,
      );
    });
    return { documentId };
  });

// Approve a filed walkthrough for marketing: its post copy drops into the
// social drafts, ready to publish across channels.
export const approveWalkthrough = createServerFn({ method: "POST" })
  .inputValidator(z.object({ documentId: z.string() }))
  .handler(async ({ data }) => {
    const result = await updateDB((d) => {
      const doc = d.documents.find((x) => x.id === data.documentId);
      if (!doc || doc.kind !== "walkthrough") return null;
      doc.approval = "approved";
      const listing = d.listings.find((l) => l.id === doc.listingId);
      const postSection = doc.content.split(/## Post copy/i)[1];
      const postCopy = postSection
        ?.split(/\n## /)[0]
        ?.trim()
        .split("\n")
        .filter((line) => line.trim())
        .join(" ")
        .slice(0, 480);
      const post: SocialPost = {
        id: uid("sp"),
        content:
          postCopy ||
          `Walkthrough video approved for ${listing?.address ?? "the listing"}. Post copy is in the walkthrough document.`,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      d.social.posts.unshift(post);
      d.activity.push({
        id: uid("act"),
        kind: "outreach",
        createdAt: new Date().toISOString(),
        message: `Walkthrough approved for marketing${listing ? `: ${listing.address}` : ""}. Post copy dropped into Social drafts.`,
      });
      return { ok: true };
    });
    return result ?? { error: "walkthrough not found" as const };
  });

// Attach the rendered walkthrough video (from the video pipeline) to its
// script document so it plays right on the desk.
export const attachWalkthroughVideo = createServerFn({ method: "POST" })
  .inputValidator(z.object({ documentId: z.string(), url: z.string().min(8) }))
  .handler(async ({ data }) => {
    await updateDB((d) => {
      const doc = d.documents.find((x) => x.id === data.documentId);
      if (doc) doc.videoUrl = data.url.trim();
    });
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Marketing studio: campaigns, channels, leads                        */

const CHANNEL_BRIEFS: Record<ChannelId, string> = {
  tiktok:
    "TIKTOK: a 20 to 30 second vertical video script (hook line, 4 to 6 quick shots with spoken lines, on-screen text) plus caption with 4 hashtags.",
  instagram:
    "INSTAGRAM: a reel caption plus a carousel post version (first line is the hook), 5 hashtags, and a comment-to-DM CTA.",
  facebook:
    "FACEBOOK: an ad with Primary text (under 90 words), Headline (under 8 words), CTA button choice, and a one-line audience targeting spec.",
  linkedin:
    "LINKEDIN: a professional post in Leslie's voice (market insight angle, not salesy), 3 short paragraphs, one closing question.",
  youtube:
    "YOUTUBE SHORTS: a 45 second vertical script with hook, beats, and an end-screen CTA, plus title and description.",
};

export const createCampaign = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      listingId: z.string(),
      channels: z
        .array(z.enum(["tiktok", "instagram", "facebook", "linkedin", "youtube"]))
        .min(1),
      ownerTake: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = await readDB();
    const listing = db.listings.find((l) => l.id === data.listingId);
    if (!listing) return { error: "listing not found" as const };
    const channels = data.channels as ChannelId[];
    const take = data.ownerTake?.trim() ?? "";

    const briefs = channels.map((c) => `- ${CHANNEL_BRIEFS[c]}`).join("\n");
    const content = await runTaskBrain(
      `Campaign: ${listing.address}`,
      `Write ready-to-post marketing creatives for this listing: ${listing.beds} bed, ${listing.baths} bath, ${listing.sqft} sqft at ${listing.address}, ${listing.city}, $${listing.price.toLocaleString()}. Features: ${listing.features}.${take ? ` Leslie's own take on the house (use her voice and these points): ${take}` : ""}\n\nProduce one section per channel, each starting with a markdown heading of exactly "## <CHANNEL NAME>" in caps:\n${briefs}\n\nEvery piece ends with a lead-capture CTA (comment TOUR, DM, or the free home value report).`,
      businessContext(db),
      db.settings?.anthropicKey,
    );

    // Split the deliverable into per-channel pieces by its ## CHANNEL headings.
    const pieces: CampaignPiece[] = channels.map((c) => {
      const label = CHANNELS.find((x) => x.id === c)?.label ?? c;
      const patterns = [
        new RegExp(`##\\s*${label}`, "i"),
        new RegExp(`##\\s*${c}`, "i"),
        c === "youtube" ? /##\s*YOUTUBE( SHORTS)?/i : null,
      ].filter(Boolean) as RegExp[];
      let section = "";
      for (const re of patterns) {
        const m = content.split(re)[1];
        if (m) {
          section = m.split(/\n##\s/)[0].trim();
          break;
        }
      }
      return {
        id: uid("pc"),
        channel: c,
        content: section || content,
        status: "draft" as const,
      };
    });

    const doc: Document = {
      id: uid("doc"),
      title: `Campaign: ${listing.address}`,
      kind: "outreach",
      content,
      createdAt: new Date().toISOString(),
      listingId: listing.id,
    };
    const campaign: Campaign = {
      id: uid("cmp"),
      listingId: listing.id,
      ownerTake: take,
      channels,
      pieces,
      documentId: doc.id,
      createdAt: new Date().toISOString(),
    };
    await updateDB(async (d) => {
      d.campaigns.unshift(campaign);
      d.documents.unshift(doc);
      d.activity.push({
        id: uid("act"),
        kind: "shipped",
        createdAt: new Date().toISOString(),
        message: `Campaign drafted for ${listing.address}: ${channels.length} channel${channels.length === 1 ? "" : "s"}. Review it in the Studio, approve, then post.`,
      });
      await notify(
        d,
        "campaign",
        `ListingDesk: a ${channels.length}-channel campaign for ${listing.address} is drafted and waiting for your approval.`,
      );
    });
    return { campaign, documentId: doc.id };
  });

export const setPieceStatus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      campaignId: z.string(),
      pieceId: z.string(),
      status: z.enum(["draft", "approved", "posted"]),
    }),
  )
  .handler(async ({ data }) => {
    await updateDB((d) => {
      const cmp = d.campaigns.find((c) => c.id === data.campaignId);
      const piece = cmp?.pieces.find((p) => p.id === data.pieceId);
      if (!cmp || !piece) return;
      piece.status = data.status;
      if (data.status === "posted") {
        piece.postedAt = new Date().toISOString();
        const listing = d.listings.find((l) => l.id === cmp.listingId);
        const label =
          CHANNELS.find((x) => x.id === piece.channel)?.label ?? piece.channel;
        d.activity.push({
          id: uid("act"),
          kind: "outreach",
          createdAt: new Date().toISOString(),
          message: `Marked the ${label} piece for ${listing?.address ?? "a listing"} as posted. Connect ${label} in the Studio to auto-publish for real.`,
        });
      }
    });
    return { ok: true };
  });

export const connectChannel = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.enum(["tiktok", "instagram", "facebook", "linkedin", "youtube"]),
      handle: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await updateDB((d) => {
      const ch = d.channels.find((c) => c.id === data.id);
      if (!ch) return;
      ch.connected = !ch.connected;
      if (data.handle?.trim()) ch.handle = data.handle.trim();
      d.activity.push({
        id: uid("act"),
        kind: "system",
        createdAt: new Date().toISOString(),
        message: ch.connected
          ? `${data.id} marked connected as ${ch.handle}. Add the real account keys under Integrations to auto-publish.`
          : `${data.id} disconnected.`,
      });
    });
    return { ok: true };
  });

export const addLead = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      source: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().optional(),
      listingId: z.string().optional(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const lead: LeadContact = {
      id: uid("lead"),
      name: data.name.trim(),
      source: data.source.trim(),
      phone: data.phone?.trim() || undefined,
      email: data.email?.trim() || undefined,
      listingId: data.listingId || undefined,
      stage: "new",
      notes: data.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await updateDB(async (d) => {
      d.leads.unshift(lead);
      d.metrics.leadsThisWeek += 1;
      const l = d.listings.find((x) => x.id === lead.listingId);
      if (l) l.leadCount += 1;
      d.activity.push({
        id: uid("act"),
        kind: "outreach",
        createdAt: new Date().toISOString(),
        message: `New lead: ${lead.name} (${lead.source}). Answer inside five minutes; draft the follow-up from the Studio.`,
      });
      const where = l ? ` on ${l.address}` : "";
      await notify(
        d,
        "lead",
        `ListingDesk: new lead ${lead.name} (${lead.source})${where}${lead.phone ? `, ${lead.phone}` : ""}. Answer inside 5 minutes.`,
      );
    });
    return { lead };
  });

export const setLeadStage = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      stage: z.enum(["new", "contacted", "nurturing", "client"]),
    }),
  )
  .handler(async ({ data }) => {
    await updateDB((d) => {
      const lead = d.leads.find((x) => x.id === data.id);
      if (lead) lead.stage = data.stage as LeadStage;
    });
    return { ok: true };
  });

export const draftFollowUp = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const db = await readDB();
    const lead = db.leads.find((l) => l.id === data.id);
    if (!lead) return { error: "lead not found" as const };
    const listing = db.listings.find((l) => l.id === lead.listingId);
    const content = await runTaskBrain(
      `Follow-up: ${lead.name}`,
      `Draft a three-touch follow-up for this lead: ${lead.name}, source ${lead.source}, stage ${lead.stage}${listing ? `, interested in ${listing.address} (${listing.city}, $${listing.price.toLocaleString()})` : ""}${lead.notes ? `. Notes: ${lead.notes}` : ""}. Touch 1: a text to send today. Touch 2: an email for day 2 (subject plus body). Touch 3: a voicemail script for day 4. Warm, personal, Leslie's voice, each with one clear next step.`,
      businessContext(db),
      db.settings?.anthropicKey,
    );
    const doc: Document = {
      id: uid("doc"),
      title: `Follow-up: ${lead.name}`,
      kind: "sequence",
      content,
      createdAt: new Date().toISOString(),
      listingId: lead.listingId,
    };
    await updateDB(async (d) => {
      const l = d.leads.find((x) => x.id === data.id);
      if (l) l.followUpDocumentId = doc.id;
      d.documents.unshift(doc);
      d.activity.push({
        id: uid("act"),
        kind: "outreach",
        createdAt: new Date().toISOString(),
        message: `Follow-up sequence filed for ${lead.name}. Text today, email day 2, voicemail day 4.`,
      });
      await notify(
        d,
        "followup",
        `ListingDesk: the follow-up for ${lead.name} is written. Touch 1 is a text ready to send now.`,
      );
    });
    return { documentId: doc.id };
  });

export const connectIntegration = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      apiKey: z.string().optional(),
      disconnect: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const updated = await updateDB((db) => {
      const integration = db.integrations.find((i) => i.id === data.id);
      if (!integration) return null;
      if (data.disconnect) {
        integration.connected = false;
        integration.apiKey = undefined;
        integration.connectedAt = undefined;
      } else if (data.apiKey?.trim()) {
        integration.connected = true;
        integration.apiKey = data.apiKey.trim();
        integration.connectedAt = new Date().toISOString();
      }
      return integration;
    });
    return { integration: updated ? publicIntegration(updated) : null };
  });

/* ------------------------------------------------------------------ */
/* Growth ops: social, email, ads, team, billing.                      */
/* Draft actions use the agent brain; "post"/"send" update local state */
/* only until real accounts are connected via Integrations.            */

export const draftSocialPost = createServerFn({ method: "POST" }).handler(
  async () => {
    const db = await readDB();
    const content = await askBrain(
      "Draft one social post (under 260 characters, no hashtag spam, no em-dashes) for Leslie's audience: either a did-you-know buyer-program line or a hook for the newest listing. End with a simple CTA. Return ONLY the post text.",
      businessContext(db),
      db.settings?.anthropicKey,
    );
    const post: SocialPost = {
      id: uid("sp"),
      content: content.slice(0, 500),
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    await updateDB((d) => {
      d.social.posts.unshift(post);
    });
    return { post };
  },
);

export const postSocialPost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await updateDB((d) => {
      const p = d.social.posts.find((x) => x.id === data.id);
      if (p) {
        p.status = "posted";
        p.postedAt = new Date().toISOString();
      }
      d.activity.push({
        id: uid("act"),
        kind: "outreach",
        createdAt: new Date().toISOString(),
        message: `Marked a post as published on ${d.social.handle}. Connect a real account under Integrations to auto-publish.`,
      });
    });
    return { ok: true };
  });

export const deleteSocialPost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await updateDB((d) => {
      d.social.posts = d.social.posts.filter((x) => x.id !== data.id);
    });
    return { ok: true };
  });

export const toggleAutoPost = createServerFn({ method: "POST" }).handler(
  async () => {
    const on = await updateDB((d) => {
      d.social.autoPost = !d.social.autoPost;
      return d.social.autoPost;
    });
    return { autoPost: on };
  },
);

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .inputValidator(z.object({ to: z.string().min(3) }))
  .handler(async ({ data }) => {
    const item: EmailItem = {
      id: uid("em"),
      to: data.to.trim(),
      subject: "Welcome from Leslie Smith, KW The Lakes",
      preview:
        "Thanks for stopping by. Your free home value report link is inside, no strings attached.",
      sentAt: new Date().toISOString(),
      kind: "welcome",
    };
    await updateDB((d) => {
      d.email.sent.unshift(item);
      d.activity.push({
        id: uid("act"),
        kind: "outreach",
        createdAt: new Date().toISOString(),
        message: `Queued a welcome email to ${item.to}. Connect Mailchimp under Integrations to deliver for real.`,
      });
    });
    return { item };
  });

export const draftAdCampaign = createServerFn({ method: "POST" }).handler(
  async () => {
    const db = await readDB();
    const spec = await askBrain(
      "Draft a Meta ad campaign for the newest active or coming-soon listing: a short campaign name, a one-line audience targeting spec (buyers in the Temecula valley), and a suggested daily budget in dollars. Three short lines.",
      businessContext(db),
      db.settings?.anthropicKey,
    );
    const campaign: AdCampaign = {
      id: uid("ad"),
      name: "Just-listed reach",
      audience:
        spec.split("\n")[1]?.slice(0, 140) ??
        "Buyers 28 to 60 within 25 miles of Temecula, interested in new homes",
      dailyBudget: 25,
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    const doc: Document = {
      id: uid("doc"),
      title: "Ad campaign draft: just-listed reach",
      kind: "outreach",
      content: spec,
      createdAt: new Date().toISOString(),
    };
    await updateDB((d) => {
      d.ads.campaigns.unshift(campaign);
      d.documents.unshift(doc);
    });
    return { campaign, documentId: doc.id };
  },
);

export const addTeamMember = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      role: z.string().min(1),
      email: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const member: TeamMember = {
      id: uid("tm"),
      name: data.name.trim(),
      role: data.role.trim(),
      email: data.email?.trim(),
      addedAt: new Date().toISOString(),
    };
    await updateDB((d) => {
      d.team.push(member);
    });
    return { member };
  });

export const enablePayments = createServerFn({ method: "POST" }).handler(
  async () => {
    await updateDB((d) => {
      d.billing.stripeEnabled = true;
      d.activity.push({
        id: uid("act"),
        kind: "system",
        createdAt: new Date().toISOString(),
        message:
          "Payments marked ready. Connect a live Stripe key under Integrations to take deposits from the desk.",
      });
    });
    return { ok: true };
  },
);

/* ------------------------------------------------------------------ */
/* Import, uploads, deletes, and her own keys                          */

const STREET_SUFFIXES = new Set([
  "way", "st", "street", "dr", "drive", "ct", "court", "ave", "avenue",
  "ln", "lane", "rd", "road", "blvd", "boulevard", "cir", "circle", "pl",
  "place", "loop", "trail", "ter", "terrace", "pkwy", "hwy", "bend",
]);

// Best-effort address parse from a Zillow-style listing URL
// (/homedetails/31245-Sagecrest-Way-Temecula-CA-92592/12345_zpid/).
function parseListingUrl(url: string): { address: string; city: string } {
  const m = url.match(/homedetails\/([^/]+)\//i);
  if (!m) return { address: "Imported listing", city: "" };
  const tokens = m[1].split("-").filter(Boolean);
  // Trailing tokens are usually STATE and ZIP.
  let end = tokens.length;
  if (end && /^\d{5}$/.test(tokens[end - 1])) end -= 1;
  if (end && /^[A-Za-z]{2}$/.test(tokens[end - 1])) end -= 1;
  const core = tokens.slice(0, end);
  let split = -1;
  for (let i = core.length - 1; i >= 0; i--) {
    if (STREET_SUFFIXES.has(core[i].toLowerCase())) {
      split = i;
      break;
    }
  }
  if (split === -1 || split === core.length - 1) {
    return { address: core.join(" "), city: "" };
  }
  return {
    address: core.slice(0, split + 1).join(" "),
    city: core.slice(split + 1).join(" "),
  };
}

// Paste a listing link (Zillow etc.) and it lands on the board as a staged
// shell; she confirms price and details. With an Apify token saved, the
// walkthrough video pipeline can pull the full listing later.
// Map how the listing site describes a home onto her own board stages.
function statusFromSource(status?: string): ListingStatus {
  const t = (status ?? "").toLowerCase();
  if (t.includes("sold")) return "sold";
  if (t.includes("pending") || t.includes("contingent")) return "pending";
  if (t.includes("coming") || t.includes("pre on-market")) return "coming-soon";
  return "active";
}

// Pull the listing's own photo into her storage so the board shows the real
// house rather than hotlinking someone else's server.
async function storeRemotePhoto(
  listingId: string,
  photoUrl: string,
): Promise<string | null> {
  const { STORAGE } = bindings();
  if (!STORAGE) return null;
  const got = await fetchPhotoBytes(photoUrl);
  if (!got) return null;
  const ext = got.contentType.includes("png")
    ? "png"
    : got.contentType.includes("webp")
      ? "webp"
      : "jpg";
  const photoId = `${uid("ph")}.${ext}`;
  await STORAGE.put(`listing-photos/${photoId}`, got.bytes, {
    httpMetadata: { contentType: got.contentType },
  });
  const url = `/photos/${photoId}`;
  let attached = false;
  await updateDB((db) => {
    const l = db.listings.find((x) => x.id === listingId);
    if (!l) return;
    l.photos = [...(l.photos ?? []), url];
    if (!l.photoUrl) l.photoUrl = url;
    attached = true;
  });
  if (!attached) {
    await STORAGE.delete(`listing-photos/${photoId}`);
    return null;
  }
  return url;
}

// Paste any listing link — Redfin, Zillow, an IDX page — and the desk pulls
// the real property: address, price, beds, baths, square feet, the agent's
// own remarks, the map pin, and the listing photo.
export const importListing = createServerFn({ method: "POST" })
  .inputValidator(z.object({ url: z.string().min(8) }))
  .handler(async ({ data }) => {
    const url = data.url.trim();
    const found = await lookupListingByUrl(url);
    const importId = uid("ls");

    if (found) {
      const geo =
        typeof found.lat === "number" && typeof found.lng === "number"
          ? { lat: found.lat, lng: found.lng }
          : geoForCity(found.city, importId);
      const listing: Listing = {
        id: importId,
        address: found.address,
        city: found.city,
        lat: geo.lat,
        lng: geo.lng,
        price: found.price ?? 0,
        beds: found.beds ?? 0,
        baths: found.baths ?? 0,
        sqft: found.sqft ?? 0,
        features:
          found.features ||
          [
            found.beds ? `${found.beds} bed` : "",
            found.baths ? `${found.baths} bath` : "",
            found.yearBuilt ? `built ${found.yearBuilt}` : "",
          ]
            .filter(Boolean)
            .join(" · ") ||
          "Confirm the features.",
        status: statusFromSource(found.status),
        leadCount: 0,
        sourceUrl: url,
        notes: `Pulled from the live listing${found.mls ? ` · MLS# ${found.mls}` : ""}. Confirm anything that changed.`,
        createdAt: new Date().toISOString(),
      };
      await updateDB(async (db) => {
        db.listings.unshift(listing);
        db.activity.push({
          id: uid("act"),
          kind: "system",
          createdAt: new Date().toISOString(),
          message: `Pulled ${listing.address}, ${listing.city} from the live listing — $${listing.price.toLocaleString("en-US")}, ${listing.beds} bed, ${listing.sqft.toLocaleString("en-US")} sqft. Generate the walkthrough when you are ready.`,
        });
      });
      const wanted = (found.photoUrls?.length
        ? found.photoUrls
        : found.photoUrl
          ? [found.photoUrl]
          : []
      ).slice(0, 4);
      for (const src of wanted) await storeRemotePhoto(importId, src);
      const db = await readDB();
      return {
        listing: db.listings.find((l) => l.id === importId) ?? listing,
        real: true as const,
      };
    }

    // The link did not resolve to a listing we can read — file the address so
    // she can fill in the rest by hand rather than losing the paste.
    const { address, city } = parseListingUrl(url);
    const importGeo = geoForCity(city || "", importId);
    const listing: Listing = {
      id: importId,
      address,
      city: city || "Confirm city",
      lat: importGeo.lat,
      lng: importGeo.lng,
      price: 0,
      beds: 0,
      baths: 0,
      sqft: 0,
      features: "Imported from link. Confirm details and features.",
      status: "coming-soon",
      leadCount: 0,
      sourceUrl: url,
      notes:
        "That site would not hand over the listing details, so only the address came through. Fill in price, beds and baths, or add her photos.",
      createdAt: new Date().toISOString(),
    };
    await updateDB((db) => {
      db.listings.unshift(listing);
      db.activity.push({
        id: uid("act"),
        kind: "system",
        createdAt: new Date().toISOString(),
        message: `Imported ${listing.address} from a listing link. Confirm the details, then generate the walkthrough.`,
      });
    });
    return { listing, real: false as const };
  });

// Fetch the listing photo for a home she already has on the board.
export const pullListingPhoto = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const db = await readDB();
    const listing = db.listings.find((l) => l.id === data.id);
    if (!listing) return { error: "listing not found" as const };
    if (!listing.sourceUrl)
      return { error: "no listing link on this one" as const };
    const found = await lookupListingByUrl(listing.sourceUrl);
    const sources = (found?.photoUrls?.length
      ? found.photoUrls
      : found?.photoUrl
        ? [found.photoUrl]
        : []
    ).slice(0, 4);
    if (sources.length === 0)
      return { error: "that listing would not hand over a photo" as const };
    const urls: string[] = [];
    for (const src of sources) {
      const stored = await storeRemotePhoto(listing.id, src);
      if (stored) urls.push(stored);
    }
    if (urls.length === 0)
      return { error: "photo storage is not available" as const };
    return { url: urls[0], count: urls.length };
  });

// Her own document: pasted or uploaded (the browser reads the file and
// sends its text).
export const createDocument = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().min(1),
      kind: z
        .enum(["report", "research", "walkthrough", "sequence", "outreach"])
        .optional(),
      content: z.string().min(1),
      listingId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const doc: Document = {
      id: uid("doc"),
      title: data.title.trim(),
      kind: data.kind ?? "report",
      content: data.content,
      createdAt: new Date().toISOString(),
      listingId: data.listingId || undefined,
    };
    await updateDB((d) => {
      d.documents.unshift(doc);
      d.activity.push({
        id: uid("act"),
        kind: "system",
        createdAt: new Date().toISOString(),
        message: `Document uploaded: "${doc.title}". Filed under Documents.`,
      });
    });
    return { documentId: doc.id };
  });

export const deleteListing = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    // Capture the listing's uploaded photos so their R2 objects go with it.
    const photoUrls = await updateDB((d) => {
      const l = d.listings.find((x) => x.id === data.id);
      const urls = l?.photos ?? [];
      d.listings = d.listings.filter((x) => x.id !== data.id);
      d.campaigns = d.campaigns.filter((c) => c.listingId !== data.id);
      if (l) {
        d.activity.push({
          id: uid("act"),
          kind: "system",
          createdAt: new Date().toISOString(),
          message: `Removed ${l.address} from the board.`,
        });
      }
      return urls;
    });
    const { STORAGE } = bindings();
    if (STORAGE) {
      for (const u of photoUrls) {
        const m = u.match(/^\/photos\/([A-Za-z0-9.-]+)$/);
        if (m) await STORAGE.delete(`listing-photos/${m[1]}`);
      }
    }
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await updateDB((d) => {
      d.tasks = d.tasks.filter((x) => x.id !== data.id);
    });
    return { ok: true };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await updateDB((d) => {
      d.documents = d.documents.filter((x) => x.id !== data.id);
      for (const l of d.listings) {
        if (l.walkthroughDocumentId === data.id)
          l.walkthroughDocumentId = undefined;
      }
      for (const lead of d.leads) {
        if (lead.followUpDocumentId === data.id)
          lead.followUpDocumentId = undefined;
      }
      for (const t of d.tasks) {
        if (t.outputDocumentId === data.id) t.outputDocumentId = undefined;
      }
      for (const c of d.campaigns) {
        if (c.documentId === data.id) c.documentId = undefined;
      }
    });
    return { ok: true };
  });

export const deleteLead = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await updateDB((d) => {
      d.leads = d.leads.filter((x) => x.id !== data.id);
    });
    return { ok: true };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await updateDB((d) => {
      d.campaigns = d.campaigns.filter((x) => x.id !== data.id);
    });
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await updateDB((d) => {
      d.team = d.team.filter((x) => x.id !== data.id);
    });
    return { ok: true };
  });

// Save or clear her own API keys. Stored server-side in the desk database,
// never sent back in full (masked to the last 4 characters).
export const setDeskKeys = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      anthropicKey: z.string().optional(),
      apifyToken: z.string().optional(),
      clear: z.enum(["anthropic", "apify"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const st = await updateDB((d) => {
      d.settings = d.settings ?? {};
      if (data.clear === "anthropic") d.settings.anthropicKey = undefined;
      if (data.clear === "apify") d.settings.apifyToken = undefined;
      if (data.anthropicKey?.trim()) {
        d.settings.anthropicKey = data.anthropicKey.trim();
        d.activity.push({
          id: uid("act"),
          kind: "system",
          createdAt: new Date().toISOString(),
          message:
            "Anthropic key saved. The desk brain is live: chat, walkthroughs, campaigns, and follow-ups now use Claude.",
        });
      }
      if (data.apifyToken?.trim()) {
        d.settings.apifyToken = data.apifyToken.trim();
        d.activity.push({
          id: uid("act"),
          kind: "system",
          createdAt: new Date().toISOString(),
          message:
            "Apify token saved. The walkthrough video pipeline can now pull listing photos from Zillow links.",
        });
      }
      return d.settings;
    });
    return {
      keys: {
        anthropic: maskedKey(st.anthropicKey),
        apify: maskedKey(st.apifyToken),
        brainLive: brainIsLive(st.anthropicKey),
      },
    };
  });

/* ------------------------------------------------------------------ */
/* Hire the AI employee + rate what the agents ship                    */

export const subscribeDesk = createServerFn({ method: "POST" }).handler(
  async () => {
    await updateDB((d) => {
      d.billing.subscribed = true;
      d.activity.push({
        id: uid("act"),
        kind: "system",
        createdAt: new Date().toISOString(),
        message:
          "AI employee hired: $200/mo, cancel anytime. Connect Stripe under Integrations to bill for real.",
      });
    });
    return { subscribed: true };
  },
);

export const rateActivity = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ id: z.string(), rating: z.enum(["up", "down"]) }),
  )
  .handler(async ({ data }) => {
    await updateDB((d) => {
      const a = d.activity.find((x) => x.id === data.id);
      if (a) a.rating = a.rating === data.rating ? undefined : data.rating;
    });
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Edits: fix imported details, revise documents and campaign pieces   */

export const updateListing = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      address: z.string().optional(),
      city: z.string().optional(),
      price: z.number().min(0).optional(),
      beds: z.number().min(0).optional(),
      baths: z.number().min(0).optional(),
      sqft: z.number().min(0).optional(),
      features: z.string().optional(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const updated = await updateDB((d) => {
      const l = d.listings.find((x) => x.id === data.id);
      if (!l) return null;
      if (data.address?.trim()) l.address = data.address.trim();
      if (data.city?.trim()) {
        l.city = data.city.trim();
        // Unknown cities clear the pin (unmapped) instead of keeping the old
        // city's coordinates under the new name.
        const g = geoForCity(l.city, l.id);
        l.lat = g.lat;
        l.lng = g.lng;
      }
      if (data.price !== undefined) l.price = data.price;
      if (data.beds !== undefined) l.beds = data.beds;
      if (data.baths !== undefined) l.baths = data.baths;
      if (data.sqft !== undefined) l.sqft = data.sqft;
      if (data.features?.trim()) l.features = data.features.trim();
      if (data.notes !== undefined) l.notes = data.notes.trim() || undefined;
      return l;
    });
    return { listing: updated };
  });

export const updateDocument = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await updateDB((d) => {
      const doc = d.documents.find((x) => x.id === data.id);
      if (!doc) return;
      if (data.title?.trim()) doc.title = data.title.trim();
      if (data.content?.trim()) doc.content = data.content;
    });
    return { ok: true };
  });

export const setPieceContent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      campaignId: z.string(),
      pieceId: z.string(),
      content: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    await updateDB((d) => {
      const cmp = d.campaigns.find((c) => c.id === data.campaignId);
      const piece = cmp?.pieces.find((p) => p.id === data.pieceId);
      if (piece) piece.content = data.content;
    });
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* SMS updates: phone, event prefs, Twilio, test send                  */

export const setNotifyPrefs = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      phone: z.string().optional(),
      prefs: z
        .array(
          z.enum([
            "walkthrough",
            "lead",
            "campaign",
            "task",
            "followup",
            "showing",
          ]),
        )
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const out = await updateDB((d) => {
      d.settings = d.settings ?? {};
      if (data.phone !== undefined)
        d.settings.notifyPhone = data.phone.trim() || undefined;
      if (data.prefs) d.settings.notifyPrefs = data.prefs as NotifyEvent[];
      return {
        phone: d.settings.notifyPhone ?? "",
        prefs: d.settings.notifyPrefs ?? [],
      };
    });
    return out;
  });

export const setTwilio = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      sid: z.string().optional(),
      token: z.string().optional(),
      from: z.string().optional(),
      clear: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const connected = await updateDB((d) => {
      d.settings = d.settings ?? {};
      if (data.clear) {
        d.settings.twilioSid = undefined;
        d.settings.twilioToken = undefined;
        d.settings.twilioFrom = undefined;
      } else {
        if (data.sid?.trim()) d.settings.twilioSid = data.sid.trim();
        if (data.token?.trim()) d.settings.twilioToken = data.token.trim();
        if (data.from?.trim()) d.settings.twilioFrom = data.from.trim();
        if (twilioReady(d.settings)) {
          d.activity.push({
            id: uid("act"),
            kind: "system",
            createdAt: new Date().toISOString(),
            message:
              "Twilio connected. Your agents can now text you real updates on the events you turned on.",
          });
        }
      }
      return twilioReady(d.settings);
    });
    return { twilioConnected: connected };
  });

export const sendTestSms = createServerFn({ method: "POST" }).handler(
  async () => {
    const msg = await updateDB(async (d) => {
      return await notify(
        d,
        "test",
        `ListingDesk test: hi Leslie, this is your desk. Updates like this will hit your phone when your agents ship. Reply STOP to opt out.`,
      );
    });
    return { message: msg };
  },
);

/* ------------------------------------------------------------------ */
/* Poster / flyer generator                                            */

export const generatePoster = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      listingId: z.string().optional(),
      kind: z
        .enum(["just-listed", "open-house", "did-you-know", "just-sold"])
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = await readDB();
    const kind = data.kind ?? "just-listed";
    const listing = data.listingId
      ? db.listings.find((l) => l.id === data.listingId)
      : undefined;

    const kindBrief: Record<string, string> = {
      "just-listed":
        "a JUST LISTED flyer that makes buyers want to tour this specific home",
      "open-house":
        "an OPEN HOUSE flyer with the weekend hours and a reason to show up",
      "did-you-know":
        "a DID YOU KNOW buyer-education flyer (rate buydowns near 3.99%, down payment assistance, Section 8 homeownership, free home value report) that generates leads",
      "just-sold":
        "a JUST SOLD flyer that positions Leslie as the agent who gets it done and asks for the next listing",
    };

    const listingLine = listing
      ? `The listing: ${listing.beds} bed, ${listing.baths} bath, ${listing.sqft} sqft at ${listing.address}, ${listing.city}, $${listing.price.toLocaleString()}. Features: ${listing.features}.`
      : "No specific listing; make it about Leslie's Temecula-valley farm area.";

    // Only ask the brain for copy when it is actually live. In demo mode the
    // response echoes the prompt (including this JSON shape), so we skip it and
    // use the clean, listing-specific fallback below.
    let parsed: {
      eyebrow?: string;
      headline?: string;
      bullets?: string[];
      cta?: string;
    } = {};
    if (brainIsLive(db.settings?.anthropicKey)) {
      const raw = await askBrain(
        `Write the copy for ${kindBrief[kind]}. ${listingLine}

Return ONLY a compact JSON object, no markdown fences, with exactly these keys:
{"eyebrow": "3-5 word kicker in caps case","headline":"a punchy 4-8 word headline","bullets":["4 to 5 short benefit lines, 8 words max each"],"cta":"one call to action line ending in an action (text, scan, comment, call)"}
Keep it in Leslie Smith's warm, local, no-hype voice. No em-dashes.`,
        businessContext(db),
        db.settings?.anthropicKey,
      );
      try {
        const s = raw.indexOf("{");
        const e = raw.lastIndexOf("}");
        if (s >= 0 && e > s) {
          const p = JSON.parse(raw.slice(s, e + 1));
          // Guard against the model returning the schema text verbatim.
          if (
            typeof p.headline === "string" &&
            !p.headline.includes("4-8 word") &&
            Array.isArray(p.bullets) &&
            p.bullets.length >= 2
          ) {
            parsed = p;
          }
        }
      } catch {
        parsed = {};
      }
    }

    const fallbackHead: Record<string, string> = {
      "just-listed": listing
        ? `Just listed in ${listing.city}`
        : "Your next home is closer than you think",
      "open-house": "Open house this weekend",
      "did-you-know": "You may be able to buy sooner than you think",
      "just-sold": "Another one sold and closed",
    };

    const poster: Poster = {
      id: uid("poster"),
      listingId: listing?.id,
      kind,
      eyebrow:
        parsed.eyebrow ||
        (kind === "did-you-know" ? "Did you know?" : "Leslie Smith presents"),
      headline: parsed.headline || fallbackHead[kind],
      bullets:
        parsed.bullets && parsed.bullets.length
          ? parsed.bullets.slice(0, 5)
          : listing
            ? [
                `${listing.beds} bed, ${listing.baths} bath, ${listing.sqft.toLocaleString()} sqft`,
                listing.features,
                `Offered at $${listing.price.toLocaleString()}`,
                "Private tours available this week",
              ]
            : [
                "Rates as low as 3.99% through select programs",
                "Down payment assistance may be available",
                "Section 8 homeownership programs exist",
                "A professional home value report is free",
              ],
      cta:
        parsed.cta ||
        "Text Leslie at 951-237-4991 or scan for your free home value report",
      createdAt: new Date().toISOString(),
    };

    await updateDB((d) => {
      d.posters.unshift(poster);
      d.activity.push({
        id: uid("act"),
        kind: "shipped",
        createdAt: new Date().toISOString(),
        message: `Poster ready${listing ? `: ${listing.address}` : ""}. Open it, then print or save to PDF for the open house.`,
      });
    });
    return { poster };
  });

export const deletePoster = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await updateDB((d) => {
      d.posters = d.posters.filter((p) => p.id !== data.id);
    });
    return { ok: true };
  });

export const getPoster = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const db = await readDB();
    const poster = db.posters.find((p) => p.id === data.id) ?? null;
    const listing = poster?.listingId
      ? (db.listings.find((l) => l.id === poster.listingId) ?? null)
      : null;
    return { poster, owner: db.owner, listing };
  });

/* ------------------------------------------------------------------ */
/* Her real listing photos (stored in the desk's R2 bucket)            */

const MAX_PHOTO_BYTES = 8_000_000;

export const uploadListingPhoto = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      listingId: z.string(),
      dataBase64: z.string().min(8).max(11_000_000),
      contentType: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { STORAGE } = bindings();
    if (!STORAGE) return { error: "storage not available" as const };
    const ct = data.contentType?.toLowerCase() ?? "image/jpeg";
    if (!/^image\/(jpeg|png|webp)$/.test(ct))
      return { error: "unsupported type" as const };

    let bytes: Uint8Array;
    try {
      const bin = atob(data.dataBase64);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch {
      return { error: "bad image data" as const };
    }
    if (bytes.length < 100 || bytes.length > MAX_PHOTO_BYTES)
      return { error: "photo too large" as const };

    const ext = ct === "image/png" ? "png" : ct === "image/webp" ? "webp" : "jpg";
    const photoId = `${uid("ph")}.${ext}`;
    await STORAGE.put(`listing-photos/${photoId}`, bytes, {
      httpMetadata: { contentType: ct },
    });
    const url = `/photos/${photoId}`;

    const result = await updateDB(async (d) => {
      const l = d.listings.find((x) => x.id === data.listingId);
      if (!l) return null;
      l.photos = [...(l.photos ?? []), url];
      if (!l.photoUrl) l.photoUrl = url;
      d.activity.push({
        id: uid("act"),
        kind: "system",
        createdAt: new Date().toISOString(),
        message: `Photo uploaded for ${l.address} (${l.photos.length} on file). The walkthrough video pipeline uses her real photos.`,
      });
      return { url, count: l.photos.length };
    });
    if (!result) {
      await STORAGE.delete(`listing-photos/${photoId}`);
      return { error: "listing not found" as const };
    }
    return result;
  });

export const deleteListingPhoto = createServerFn({ method: "POST" })
  .inputValidator(z.object({ listingId: z.string(), url: z.string() }))
  .handler(async ({ data }) => {
    const { STORAGE } = bindings();
    // Only touch R2 when the url was really removed from THIS listing and no
    // other listing still references it.
    const removed = await updateDB((d) => {
      const l = d.listings.find((x) => x.id === data.listingId);
      if (!l) return false;
      const before = l.photos?.length ?? 0;
      l.photos = (l.photos ?? []).filter((p) => p !== data.url);
      if (l.photoUrl === data.url) l.photoUrl = l.photos[0];
      const stillReferenced = d.listings.some(
        (x) => x.id !== l.id && x.photos?.includes(data.url),
      );
      return l.photos.length < before && !stillReferenced;
    });
    const m = data.url.match(/^\/photos\/([A-Za-z0-9.-]+)$/);
    if (removed && m && STORAGE)
      await STORAGE.delete(`listing-photos/${m[1]}`);
    return { ok: removed };
  });

/* ------------------------------------------------------------------ */
/* Area search: the whole market around her, live                      */

export const searchArea = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      area: z.string().default("all"),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      beds: z.number().optional(),
      propertyType: z
        .enum(["house", "condo-townhouse", "land", "any"])
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const result = await searchMarket(data);
    return result;
  });

/* ------------------------------------------------------------------ */
/* Clients and buyers                                                  */

export const getClients = createServerFn({ method: "GET" }).handler(
  async () => {
    const db = await readDB();
    return {
      owner: db.owner,
      clients: db.clients ?? [],
      listings: db.listings,
      documents: db.documents.map((d) => ({ ...d, content: "" })),
      areas: Object.entries(SEARCH_AREAS).map(([id, a]) => ({
        id,
        label: a.label,
      })),
    };
  },
);

const clientFields = {
  name: z.string().min(1),
  kind: z.enum(["first-time", "buyer", "seller", "past"]).optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  cities: z.array(z.string()).optional(),
  beds: z.number().optional(),
  timeline: z.string().optional(),
  preapproved: z.boolean().optional(),
  lender: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  listingId: z.string().optional(),
  nextFollowUp: z.string().optional(),
};

export const addClient = createServerFn({ method: "POST" })
  .inputValidator(z.object(clientFields))
  .handler(async ({ data }) => {
    const client: Client = {
      id: uid("cl"),
      name: data.name.trim(),
      kind: data.kind ?? "buyer",
      stage: data.kind === "seller" ? "consult" : "consult",
      phone: data.phone?.trim() || undefined,
      email: data.email?.trim() || undefined,
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax,
      cities: data.cities?.filter(Boolean),
      beds: data.beds,
      timeline: data.timeline?.trim() || undefined,
      preapproved: data.preapproved ?? false,
      lender: data.lender?.trim() || undefined,
      source: data.source?.trim() || "Added by hand",
      notes: data.notes?.trim() || undefined,
      listingId: data.listingId || undefined,
      savedHomes: [],
      touches: [],
      // Default: call them tomorrow. She can move it any time.
      nextFollowUp:
        data.nextFollowUp || new Date(Date.now() + 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    await updateDB((db) => {
      db.clients.unshift(client);
      db.activity.push({
        id: uid("act"),
        kind: "outreach",
        createdAt: new Date().toISOString(),
        message: `${client.name} added to the client book${
          client.kind === "first-time" ? " as a first-time buyer" : ""
        }. Follow-up is on the queue.`,
      });
    });
    return { client };
  });

export const updateClient = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), ...clientFields }).partial({ name: true }))
  .handler(async ({ data }) => {
    await updateDB((db) => {
      const c = db.clients.find((x) => x.id === data.id);
      if (!c) return;
      if (data.name !== undefined && data.name.trim()) c.name = data.name.trim();
      if (data.kind !== undefined) c.kind = data.kind;
      if (data.phone !== undefined) c.phone = data.phone.trim() || undefined;
      if (data.email !== undefined) c.email = data.email.trim() || undefined;
      if (data.budgetMin !== undefined) c.budgetMin = data.budgetMin;
      if (data.budgetMax !== undefined) c.budgetMax = data.budgetMax;
      if (data.cities !== undefined) c.cities = data.cities.filter(Boolean);
      if (data.beds !== undefined) c.beds = data.beds;
      if (data.timeline !== undefined)
        c.timeline = data.timeline.trim() || undefined;
      if (data.preapproved !== undefined) c.preapproved = data.preapproved;
      if (data.lender !== undefined) c.lender = data.lender.trim() || undefined;
      if (data.source !== undefined) c.source = data.source.trim() || undefined;
      if (data.notes !== undefined) c.notes = data.notes.trim() || undefined;
      if (data.listingId !== undefined) c.listingId = data.listingId || undefined;
      if (data.nextFollowUp !== undefined)
        c.nextFollowUp = data.nextFollowUp || undefined;
    });
    return { ok: true };
  });

export const setClientStage = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      stage: z.enum([
        "consult",
        "preapproval",
        "touring",
        "offer",
        "contingencies",
        "closing",
        "closed",
      ]),
    }),
  )
  .handler(async ({ data }) => {
    await updateDB(async (db) => {
      const c = db.clients.find((x) => x.id === data.id);
      if (!c) return;
      c.stage = data.stage;
      const label =
        CLIENT_STAGES.find((s) => s.id === data.stage)?.label ?? data.stage;
      db.activity.push({
        id: uid("act"),
        kind: "outreach",
        createdAt: new Date().toISOString(),
        message: `${c.name} moved to ${label.toLowerCase()}.`,
      });
      if (data.stage === "closing" || data.stage === "closed") {
        await notify(
          db,
          "followup",
          `ListingDesk: ${c.name} is at ${label.toLowerCase()}. Time for the closing touches.`,
        );
      }
    });
    return { ok: true };
  });

// Logging a call or text stamps the client and pushes the next follow-up out.
export const logClientTouch = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      note: z.string().min(1),
      snoozeDays: z.number().min(0).max(365).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await updateDB((db) => {
      const c = db.clients.find((x) => x.id === data.id);
      if (!c) return;
      const at = new Date().toISOString();
      c.touches = [{ id: uid("ct"), note: data.note.trim(), at }, ...(c.touches ?? [])].slice(0, 40);
      c.lastTouchAt = at;
      const days = data.snoozeDays ?? 7;
      c.nextFollowUp = new Date(Date.now() + days * 86_400_000).toISOString();
      db.activity.push({
        id: uid("act"),
        kind: "outreach",
        createdAt: at,
        message: `Touched base with ${c.name}: ${data.note.trim()}`,
      });
    });
    return { ok: true };
  });

export const deleteClient = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await updateDB((db) => {
      db.clients = db.clients.filter((c) => c.id !== data.id);
    });
    return { ok: true };
  });

export const saveHomeForClient = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      clientId: z.string(),
      address: z.string().min(1),
      city: z.string().default(""),
      price: z.number().min(0),
      beds: z.number().optional(),
      baths: z.number().optional(),
      sqft: z.number().optional(),
      url: z.string().optional(),
      note: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    let saved = false;
    let already = false;
    await updateDB((db) => {
      const c = db.clients.find((x) => x.id === data.clientId);
      if (!c) return;
      c.savedHomes = c.savedHomes ?? [];
      if (
        c.savedHomes.some(
          (h) => h.address.toLowerCase() === data.address.trim().toLowerCase(),
        )
      ) {
        already = true;
        return;
      }
      c.savedHomes.unshift({
        id: uid("sh"),
        address: data.address.trim(),
        city: data.city.trim(),
        price: data.price,
        beds: data.beds,
        baths: data.baths,
        sqft: data.sqft,
        url: data.url,
        note: data.note?.trim() || undefined,
        savedAt: new Date().toISOString(),
      });
      saved = true;
      db.activity.push({
        id: uid("act"),
        kind: "outreach",
        createdAt: new Date().toISOString(),
        message: `Saved ${data.address.trim()} for ${c.name}. Send it over with a showing time.`,
      });
    });
    if (already) return { ok: false, error: "already saved" as const };
    if (!saved) return { ok: false, error: "client not found" as const };
    return { ok: true };
  });

export const removeSavedHome = createServerFn({ method: "POST" })
  .inputValidator(z.object({ clientId: z.string(), homeId: z.string() }))
  .handler(async ({ data }) => {
    await updateDB((db) => {
      const c = db.clients.find((x) => x.id === data.clientId);
      if (!c) return;
      c.savedHomes = (c.savedHomes ?? []).filter((h) => h.id !== data.homeId);
    });
    return { ok: true };
  });

// The first-time buyer packet, written for THIS buyer's budget and city and
// laid out on the Keller Williams home purchasing process.
export const generateBuyerGuide = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const db = await readDB();
    const c = db.clients.find((x) => x.id === data.id);
    if (!c) return { error: "client not found" as const };

    const budget =
      c.budgetMin || c.budgetMax
        ? `$${(c.budgetMin ?? 0).toLocaleString("en-US")} to $${(c.budgetMax ?? 0).toLocaleString("en-US")}`
        : "budget still being set";
    const content = await runTaskBrain(
      `Buyer guide: ${c.name}`,
      `Write the complete first-time home buyer guide Leslie hands to ${c.name}. Budget: ${budget}. Areas: ${(c.cities ?? ["the Temecula valley"]).join(", ")}. Bedrooms wanted: ${c.beds ?? "flexible"}. Timeline: ${c.timeline ?? "not set"}. Preapproved: ${c.preapproved ? "yes" : "not yet"}.${c.notes ? ` What she knows about them: ${c.notes}` : ""}

Follow the Keller Williams home purchasing process, in this order, with a short plain-English section for each step: select an agent, obtain financial preapproval, buyer consultation to analyze needs, select properties, view properties, write an offer to purchase, negotiate terms, accept the contract, remove contingencies (inspections, mortgage financing with credit/underwriting/appraisal/survey/insurance, title search and title insurance), obtain funds for closing, close on the property, take possession.

Also include:
- What money they actually need and when (earnest money, inspection, appraisal, down payment, closing costs), with real dollar figures for their price range.
- Down payment assistance and low-rate programs worth asking about in Riverside County.
- What their monthly payment looks like at the top of their range, with taxes, insurance and any HOA called out.
- Five questions to ask a lender this week.
- What Leslie does at each step so they always know who is doing what.
- A short "your next three moves" close.

Write it warm, specific, and free of jargon. No hype, no invented rates — describe programs by type and tell them to confirm current numbers with the lender.`,
      businessContext(db),
      db.settings?.anthropicKey,
    );

    const docId = uid("doc");
    await updateDB(async (d) => {
      const client = d.clients.find((x) => x.id === data.id);
      const now = new Date().toISOString();
      const prior = client?.guideDocumentId
        ? d.documents.find((x) => x.id === client.guideDocumentId)
        : undefined;
      if (prior) {
        prior.content = content;
        prior.createdAt = now;
      } else {
        d.documents.unshift({
          id: docId,
          title: `Buyer guide: ${c.name}`,
          kind: "guide",
          content,
          createdAt: now,
        });
        if (client) client.guideDocumentId = docId;
      }
      d.activity.push({
        id: uid("act"),
        kind: "shipped",
        createdAt: now,
        message: `First-time buyer guide ready for ${c.name}. Send it today; it answers the money questions.`,
      });
      await notify(
        d,
        "followup",
        `ListingDesk: the buyer guide for ${c.name} is written and ready to send.`,
      );
    });
    return { documentId: docId };
  });

// The next follow-up she owes this client, in her voice.
export const draftClientFollowUp = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const db = await readDB();
    const c = db.clients.find((x) => x.id === data.id);
    if (!c) return { error: "client not found" as const };

    const stage =
      CLIENT_STAGES.find((s) => s.id === c.stage)?.label ?? c.stage;
    const saved = (c.savedHomes ?? [])
      .slice(0, 3)
      .map((h) => `${h.address}, ${h.city} at $${h.price.toLocaleString("en-US")}`)
      .join("; ");
    const content = await runTaskBrain(
      `Follow-up: ${c.name}`,
      `Write Leslie's next follow-up to ${c.name}. They are a ${c.kind === "first-time" ? "first-time buyer" : c.kind} at the "${stage}" step.${c.lastTouchAt ? ` Last touch: ${(c.touches ?? [])[0]?.note ?? "logged"}.` : " No touches logged yet."}${saved ? ` Homes saved for them: ${saved}.` : ""}${c.notes ? ` Notes: ${c.notes}` : ""}

Give her, ready to send:
1) A text message, two sentences, warm and specific, with one clear ask.
2) An email version with a subject line, five sentences max.
3) A voicemail script, thirty seconds.
4) The single next step she should take for them this week, and the one after that.
5) If they are a first-time buyer, one sentence that quietly removes a money fear.

No pressure tactics, no "just checking in". Reference their actual situation.`,
      businessContext(db),
      db.settings?.anthropicKey,
    );

    const docId = uid("doc");
    await updateDB(async (d) => {
      const client = d.clients.find((x) => x.id === data.id);
      const now = new Date().toISOString();
      d.documents.unshift({
        id: docId,
        title: `Follow-up: ${c.name}`,
        kind: "sequence",
        content,
        createdAt: now,
      });
      if (client) client.followUpDocumentId = docId;
      d.activity.push({
        id: uid("act"),
        kind: "outreach",
        createdAt: now,
        message: `Follow-up drafted for ${c.name}. Text, email and voicemail are filed.`,
      });
      await notify(
        d,
        "followup",
        `ListingDesk: your follow-up for ${c.name} is drafted and waiting.`,
      );
    });
    return { documentId: docId };
  });

/* ------------------------------------------------------------------ */
/* Her listing presentation and marketing plan                         */

export const generateListingPresentation = createServerFn({ method: "POST" })
  .inputValidator(z.object({ listingId: z.string().optional() }))
  .handler(async ({ data }) => {
    const db = await readDB();
    const listing = data.listingId
      ? db.listings.find((l) => l.id === data.listingId)
      : undefined;

    const content = await runTaskBrain(
      listing ? `Listing presentation: ${listing.address}` : "Listing presentation",
      `Write Leslie's listing presentation${
        listing
          ? ` for ${listing.address}, ${listing.city} — ${listing.beds} bed, ${listing.baths} bath, ${listing.sqft} sqft, priced $${listing.price.toLocaleString("en-US")}. Features: ${listing.features}.`
          : " as a reusable template for a Temecula valley seller."
      }

She wins listings by showing exactly how the home gets marketed. Cover, in this order:

1) The opening promise: one paragraph on what she does differently.
2) Pricing strategy: how the price gets set from real comparables, what happens to a home that sits, and the first two weeks being the whole ball game.
3) The marketing plan, as a checklist of what goes live and when. Include: just-listed marketing, a single property website, a cinematic video walkthrough, virtual tour, professional photography, print flyers and an eFlyer campaign, Facebook and Instagram campaigns, TikTok and YouTube Shorts, a listing landing page, blog post, text-message capture on the sign, open house marketing, and just-sold marketing after it closes.
4) Week one, week two, week three: what she does and what the seller sees.
5) Communication promise: how often they hear from her and how.
6) What she needs from the seller before photos.
7) The close: three reasons to sign today.

Write it as something she can read aloud at a kitchen table. Concrete, confident, no fluff.`,
      businessContext(db),
      db.settings?.anthropicKey,
    );

    const docId = uid("doc");
    await updateDB((d) => {
      const now = new Date().toISOString();
      d.documents.unshift({
        id: docId,
        title: listing
          ? `Listing presentation: ${listing.address}`
          : "Listing presentation",
        kind: "presentation",
        content,
        createdAt: now,
        listingId: listing?.id,
      });
      d.activity.push({
        id: uid("act"),
        kind: "shipped",
        createdAt: now,
        message: listing
          ? `Listing presentation ready for ${listing.address}. Print it for the appointment.`
          : "Listing presentation template ready.",
      });
    });
    return { documentId: docId };
  });

// Turns a live area search into marketing: a market-update post she can run
// across her channels, plus the numbers behind it filed as a document.
export const postMarketUpdate = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      areaLabel: z.string().min(1),
      count: z.number().min(0),
      medianPrice: z.number().min(0),
      medianPpsf: z.number().min(0),
      medianDom: z.number().min(0),
      newThisWeek: z.number().min(0),
      highlights: z
        .array(
          z.object({
            address: z.string(),
            city: z.string(),
            price: z.number(),
            beds: z.number().optional(),
            baths: z.number().optional(),
            sqft: z.number().optional(),
          }),
        )
        .max(6)
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = await readDB();
    const homes = (data.highlights ?? [])
      .map(
        (h) =>
          `${h.address}, ${h.city} — $${h.price.toLocaleString("en-US")}${h.beds ? `, ${h.beds} bd` : ""}${h.sqft ? `, ${h.sqft.toLocaleString("en-US")} sqft` : ""}`,
      )
      .join("\n");

    const content = await runTaskBrain(
      `Market update: ${data.areaLabel}`,
      `Write Leslie's market update for ${data.areaLabel}. Live numbers from the MLS right now: ${data.count} homes for sale, median price $${data.medianPrice.toLocaleString("en-US")}, median $${data.medianPpsf}/sqft, median ${data.medianDom} days on market, ${data.newThisWeek} new in the last week.${homes ? `\n\nA few that stand out:\n${homes}` : ""}

Give her:
1) A TikTok / Reels script, 30 seconds, with the hook in the first three seconds and on-screen text per beat.
2) An Instagram caption with hashtags.
3) A Facebook post aimed at buyers who think they missed their window.
4) A LinkedIn version for the referral crowd, professional tone.
5) A three-line text she can send to past clients.
6) One line she can put on a sign rider or story sticker.

Use the real numbers. Say what they mean for a buyer and for a seller in one line each. No hype, no fake urgency.`,
      businessContext(db),
      db.settings?.anthropicKey,
    );

    const docId = uid("doc");
    await updateDB(async (d) => {
      const now = new Date().toISOString();
      d.documents.unshift({
        id: docId,
        title: `Market update: ${data.areaLabel}`,
        kind: "market",
        content,
        createdAt: now,
      });
      d.social.posts.unshift({
        id: uid("sp"),
        content: `${data.areaLabel} right now: ${data.count} homes on the market, median $${data.medianPrice.toLocaleString("en-US")}, ${data.medianDom} days to sell. ${data.newThisWeek} came out this week. Want the full list before the weekend? Comment MARKET and I'll send it. — Leslie, KW The Lakes`,
        status: "draft",
        createdAt: now,
      });
      d.activity.push({
        id: uid("act"),
        kind: "shipped",
        createdAt: now,
        message: `Market update written for ${data.areaLabel} off live MLS numbers. The post is in your social drafts.`,
      });
      await notify(
        d,
        "campaign",
        `ListingDesk: your ${data.areaLabel} market update is drafted and the post is queued.`,
      );
    });
    return { documentId: docId };
  });

/* ------------------------------------------------------------------ */
/* Single property websites: the public page every listing gets        */

export const getPublicListing = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const db = await readDB();
    const listing = db.listings.find((l) => l.id === data.id) ?? null;
    if (!listing) return { listing: null, owner: db.owner, videoUrl: null };
    const doc = listing.walkthroughDocumentId
      ? db.documents.find((d) => d.id === listing.walkthroughDocumentId)
      : undefined;
    return {
      listing,
      owner: db.owner,
      videoUrl: doc?.videoUrl ?? null,
    };
  });

// The lead capture on a property page. Real leads, straight into her book,
// and she gets the text before the buyer closes the tab.
export const captureLead = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      listingId: z.string(),
      name: z.string().min(1).max(120),
      phone: z.string().max(40).optional(),
      email: z.string().max(160).optional(),
      message: z.string().max(600).optional(),
    }),
  )
  .handler(async ({ data }) => {
    let ok = false;
    await updateDB(async (db) => {
      const listing = db.listings.find((l) => l.id === data.listingId);
      if (!listing) return;
      const now = new Date().toISOString();
      db.leads.unshift({
        id: uid("lead"),
        name: data.name.trim(),
        source: `Property page: ${listing.address}`,
        phone: data.phone?.trim() || undefined,
        email: data.email?.trim() || undefined,
        listingId: listing.id,
        stage: "new",
        notes: data.message?.trim() || undefined,
        createdAt: now,
      });
      if (db.leads.length > 200) db.leads = db.leads.slice(0, 200);
      listing.leadCount += 1;
      db.metrics.leadsThisWeek += 1;
      db.activity.push({
        id: uid("act"),
        kind: "outreach",
        createdAt: now,
        message: `New lead from the ${listing.address} property page: ${data.name.trim()}. Call within five minutes.`,
      });
      await notify(
        db,
        "lead",
        `ListingDesk: ${data.name.trim()} just asked about ${listing.address}${data.phone ? ` — ${data.phone.trim()}` : ""}. Call them now.`,
      );
      ok = true;
    });
    return { ok };
  });
