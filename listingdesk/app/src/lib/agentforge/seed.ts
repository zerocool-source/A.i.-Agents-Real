import { DB } from "./types";

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);

// Leslie's desk: four listings across the Temecula valley, one walkthrough
// filed and one waiting to be generated, plus the buyer-programs one-pager
// her flyers are built from.
export function buildSeed(): DB {
  return {
    owner: {
      name: "Leslie",
      brokerage: "Keller Williams The Lakes",
      dre: "DRE #01988720",
      phone: "951-237-4991",
      serviceArea:
        "Temecula, Murrieta, Menifee, Lake Elsinore, San Jacinto, Moreno Valley, Hemet",
    },
    social: {
      handle: "@lesliesmithhomes",
      autoPost: false,
      posts: [
        {
          id: "sp-1",
          content:
            "Did you know? You may be able to buy with rates as low as 3.99% through select builder and lender programs, and down payment assistance is real. DM me for the free buyer-programs one-pager. Serving the Temecula valley.",
          status: "draft",
          createdAt: hoursAgo(22),
        },
      ],
    },
    email: {
      address: "LeslieSmithSo@kw.com",
      sent: [
        {
          id: "em-1",
          to: "supergood95@gmail.com",
          subject: "Welcome to ListingDesk",
          preview:
            "Your desk is live. Four listings staged, one walkthrough filed, and the wire is moving.",
          sentAt: daysAgo(2),
          kind: "welcome",
        },
      ],
      received: 0,
    },
    site: {
      url: "https://listingdesk.higgsfield.app",
      domain: "listingdesk.higgsfield.app",
      status: "live",
    },
    team: [
      {
        id: "tm-1",
        name: "Leslie Smith",
        role: "Agent, Owner",
        addedAt: daysAgo(12),
      },
    ],
    ads: { campaigns: [] },
    billing: { stripeEnabled: false },
    channels: [
      { id: "tiktok", handle: "@lesliesmithhomes", connected: false },
      { id: "instagram", handle: "@lesliesmithhomes", connected: false },
      { id: "facebook", handle: "Leslie Smith Homes", connected: false },
      { id: "linkedin", handle: "Leslie Smith, KW The Lakes", connected: false },
      { id: "youtube", handle: "@lesliesmithhomes", connected: false },
    ],
    campaigns: [
      {
        id: "cmp-sagecrest",
        listingId: "ls-sagecrest",
        ownerTake:
          "This backyard is the one buyers keep asking me for: pool, spa, and a cul-de-sac where kids actually ride bikes. The kitchen remodel means nothing left to do but move in.",
        channels: ["instagram", "facebook"],
        pieces: [
          {
            id: "pc-sage-ig",
            channel: "instagram",
            content:
              "The backyard everyone asks me for just hit the market. Pool + spa on a Temecula cul-de-sac, 4 bed, 3 bath, remodeled kitchen with a quartz island that seats five. $689,000. Open Sat + Sun 12 to 3. Comment TOUR for the private showing link.",
            status: "approved",
          },
          {
            id: "pc-sage-fb",
            channel: "facebook",
            content:
              "Primary text: Dreaming of summer in your own pool? This 4bd/3ba Temecula cul-de-sac home has the pool, the spa, and a remodeled kitchen. $689,000.\nHeadline: Pool + spa in Temecula, $689k\nCTA: Learn More. Audience: buyers 30 to 60 within 25 miles of Temecula, interests: new home, swimming pool, Zillow.",
            status: "draft",
          },
        ],
        documentId: undefined,
        createdAt: daysAgo(1),
      },
    ],
    leads: [
      {
        id: "lead-ramos",
        name: "Priya and Dan Ramos",
        source: "Open house sign-in",
        phone: "951-555-0184",
        listingId: "ls-sagecrest",
        stage: "contacted",
        notes: "Pre-approved to $700k. Loved the backyard; asked about schools.",
        createdAt: daysAgo(2),
      },
      {
        id: "lead-cho",
        name: "Marcus Cho",
        source: "Zillow inquiry",
        email: "m.cho@example.com",
        listingId: "ls-lakeshore",
        stage: "new",
        notes: "Asked if backup offers are being taken.",
        createdAt: hoursAgo(7),
      },
      {
        id: "lead-whitfield",
        name: "Gloria Whitfield",
        source: "Referral",
        phone: "951-555-0139",
        stage: "nurturing",
        notes: "Selling in Menifee next spring; wants the free home value report.",
        createdAt: daysAgo(9),
      },
    ],
    listings: [
      {
        id: "ls-sagecrest",
        address: "31245 Sagecrest Way",
        city: "Temecula",
        price: 689000,
        beds: 4,
        baths: 3,
        sqft: 2650,
        features:
          "Pool and spa, cul-de-sac, remodeled kitchen with quartz island, three-car garage",
        status: "active",
        leadCount: 11,
        walkthroughDocumentId: "doc-walk-sagecrest",
        photoUrl: "/assets/cover-sagecrest.webp",
        lat: 33.5122,
        lng: -117.118,
        notes: "Sellers want offers reviewed after Sunday's open house.",
        createdAt: daysAgo(6),
      },
      {
        id: "ls-juniper",
        address: "27810 Juniper Bend",
        city: "Murrieta",
        price: 575000,
        beds: 3,
        baths: 2,
        sqft: 1890,
        features:
          "Paid-off solar, RV parking, new HVAC, walking distance to Monte Vista Elementary",
        status: "coming-soon",
        leadCount: 3,
        walkthroughDocumentId: "doc-walk-juniper",
        photoUrl: "/assets/cover-juniper.webp",
        lat: 33.576,
        lng: -117.196,
        notes: "Photos land Thursday. Walkthrough video should drop the same day.",
        createdAt: daysAgo(1),
      },
      {
        id: "ls-lakeshore",
        address: "1534 Lakeshore Dr",
        city: "Lake Elsinore",
        price: 449900,
        beds: 3,
        baths: 2,
        sqft: 1540,
        features: "Lake view from the primary suite, covered patio, no HOA",
        status: "pending",
        leadCount: 23,
        walkthroughDocumentId: "doc-walk-lakeshore",
        photoUrl: "/assets/cover-lakeshore.webp",
        lat: 33.665,
        lng: -117.348,
        notes: "In escrow, appraisal scheduled. Backup offers on file.",
        createdAt: daysAgo(19),
      },
      {
        id: "ls-vistadelsol",
        address: "890 Vista Del Sol",
        city: "Hemet",
        price: 389000,
        beds: 2,
        baths: 2,
        sqft: 1310,
        features: "55+ community, single story, low-maintenance yard",
        status: "sold",
        lat: 33.73,
        lng: -116.993,
        leadCount: 17,
        notes: "Closed $6k over list. Ask sellers for the review and referral.",
        createdAt: daysAgo(41),
      },
    ],
    tasks: [
      {
        id: "t-juniper-posts",
        title: "Just-listed post set for 27810 Juniper Bend",
        description:
          "Instagram, Facebook, and Nextdoor versions. Lead with paid-off solar and RV parking; coming-soon framing until Thursday photos.",
        kind: "content",
        status: "queued",
        tags: ["CONTENT", "THURSDAY"],
        listingId: "ls-juniper",
        createdAt: hoursAgo(8),
      },
      {
        id: "t-openhouse-followup",
        title: "Follow up with Sunday open house sign-ins",
        description:
          "Nine sign-ins at Sagecrest Way. Draft a text and email for each bucket: pre-approved buyers, neighbors, and just-looking. Mention offers review Monday.",
        kind: "followup",
        status: "queued",
        tags: ["FOLLOWUP"],
        listingId: "ls-sagecrest",
        createdAt: hoursAgo(16),
      },
      {
        id: "t-buyer-programs",
        title: "Refresh the buyer-programs one-pager",
        description:
          "Verify the current builder rate buydowns, CalHFA down payment assistance limits, and the Section 8 homeownership program steps. Keep it one page, plain language.",
        kind: "research",
        status: "in-progress",
        tags: ["RESEARCH"],
        createdAt: hoursAgo(4),
      },
    ],
    documents: [
      {
        id: "doc-walk-juniper",
        title: "Walkthrough: 27810 Juniper Bend",
        kind: "walkthrough",
        listingId: "ls-juniper",
        approval: "approved",
        videoUrl: "/assets/juniper-walkthrough.mp4",
        createdAt: hoursAgo(20),
        content: `# Walkthrough: 27810 Juniper Bend

**Format.** Vertical video, 31 seconds, one clean pass.

## Hook (0:00 to 0:03)
On-screen: JUST LISTED. Murrieta. $575,000. Spoken: "This Murrieta farmhouse pays its own power bill, and the RV finally has a home."

## Shot list
1. (5s) Exterior push-in. "Single-story modern farmhouse with paid-off solar."
2. (5s) Living room glide. "Bright, open, and made to gather."
3. (5s) Kitchen orbit. "Butcher-block island, white shaker cabinets."
4. (5s) Primary bedroom push. "Quiet primary at the back of the house."
5. (5s) Backyard glide. "Pergola, room to play, and RV parking on the side."

## Caption bar
Five words max per shot; keep the price pinned.

## Post copy
Coming to market in Murrieta. 3 bed, 2 bath, 1,890 sqft with PAID-OFF solar, RV parking, and a new HVAC. $575,000. Comment TOUR for the private link.
#MurrietaRealEstate #ComingSoon #TemeculaValley #PaidOffSolar

## CTA
"Comment TOUR and I will send you the private showing link before it hits the weekend."`,
      },
      {
        id: "doc-walk-lakeshore",
        title: "Walkthrough: 1534 Lakeshore Dr",
        kind: "walkthrough",
        listingId: "ls-lakeshore",
        approval: "approved",
        videoUrl: "/assets/lakeshore-walkthrough.mp4",
        createdAt: daysAgo(3),
        content: `# Walkthrough: 1534 Lakeshore Dr

**Format.** Vertical video, 31 seconds, one calm pass toward the water.

## Hook (0:00 to 0:03)
On-screen: JUST LISTED. Lake Elsinore. $449,900. Spoken: "Wake up to the lake, and no HOA telling you what to do with it."

## Shot list
1. (5s) Exterior push-in. "Coastal lake house with a covered front porch."
2. (5s) Living room glide. "Light, easy, and open to the view."
3. (5s) Kitchen orbit. "Coastal kitchen with a pale blue island."
4. (5s) Primary bedroom push. "Wake up to the water."
5. (5s) Covered patio glide. "Your seven o'clock, over the lake."

## Caption bar
Five words max per shot; keep the price pinned.

## Post copy
Just listed on the lake in Lake Elsinore. 3 bed, 2 bath, 1,540 sqft, lake-view primary, covered patio, and NO HOA. $449,900. Comment TOUR for the private link.
#LakeElsinore #JustListed #LakeView #NoHOA

## CTA
"Comment TOUR and I will send you the private showing link before the weekend."`,
      },
      {
        id: "doc-walk-sagecrest",
        title: "Walkthrough: 31245 Sagecrest Way",
        kind: "walkthrough",
        listingId: "ls-sagecrest",
        approval: "approved",
        videoUrl: "/assets/sagecrest-walkthrough.mp4",
        createdAt: daysAgo(4),
        content: `# Walkthrough: 31245 Sagecrest Way

**Format.** Vertical video, 55 seconds, filmed on phone with a gimbal.

## Hook (0:00 to 0:02)
Spoken, walking backward through the front door: "This Temecula cul-de-sac
home has the backyard everyone asks me for."
On-screen text: POOL + SPA. $689,000.

## Shot list
1. (3s) Front elevation, slow push in. "Four bedrooms, three baths, 2,650
   square feet."
2. (5s) Entry to great room, one continuous walk. "Open the door and this is
   the sight line."
3. (6s) Kitchen orbit around the quartz island. "Remodeled kitchen, quartz
   island seats five."
4. (4s) Primary suite pan. "Primary suite looks over the pool."
5. (5s) Backyard reveal, low angle over the water. "Pool, spa, and a
   cul-de-sac lot."
6. (4s) Three-car garage, quick tilt. "Storage is not a problem."
7. (3s) Sunset exterior. "Offers reviewed after Sunday's open house."

## Captions
Keep on-screen captions to five words max per shot. Price stays pinned top
right the whole video.

## Post copy
Just listed in Temecula. 4 bed, 3 bath, pool and spa on a cul-de-sac.
$689,000. Open Saturday and Sunday 12 to 3.
#TemeculaRealEstate #JustListed #TemeculaHomes #SoCalLiving

## CTA
"Comment TOUR and I will send you the private showing link before the
weekend."`,
      },
      {
        id: "doc-buyer-programs",
        title: "Did You Know: Buyer Programs One-Pager",
        kind: "outreach",
        createdAt: daysAgo(3),
        content: `# Did You Know: Buyer Programs One-Pager

The five lines that start conversations at every open house:

1. **You may be able to buy with rates as low as 3.99%** through select
   builder and lender programs. Certain programs and qualifications apply.
2. **Section 8 participants may qualify** for programs designed to help
   renters become homeowners.
3. **Down payment assistance is real.** CalHFA and local programs can cover
   most or all of the down payment for qualified buyers.
4. **Your home's value may be higher than you think.** Valley prices have
   held better than the headlines suggest.
5. **A professional home value report is available at no cost.** The QR code
   on every flyer books it.

## How to use it
Print on the back of every open house flyer. Post one line per week on
social. Every line ends with the same CTA: scan for your free home value
report.`,
      },
      {
        id: "doc-video-wins",
        title: "Why Video Walkthroughs Win the Listing",
        kind: "research",
        createdAt: daysAgo(8),
        content: `# Why Video Walkthroughs Win the Listing

## The numbers
- Listings marketed with video draw roughly 4x the inquiries of photo-only
  listings.
- Over 70% of sellers say they would choose an agent who markets with video;
  fewer than 1 in 10 agents consistently do it.
- Vertical walkthroughs under 60 seconds hold viewers to the end; the CTA at
  the close converts comments into showing requests.

## What the desk does about it
Every listing gets a walkthrough script the moment it is staged: hook,
shot-by-shot filming plan, captions, post copy, and the CTA. Film it in one
pass on a phone, post the same day.

## The listing-appointment line
"Every one of my listings gets a professional video walkthrough in the first
48 hours. Here is the one I made for the last house."`,
      },
    ],
    activity: [
      {
        id: "act-1",
        kind: "research",
        createdAt: daysAgo(3),
        message:
          "Filed the buyer-programs one-pager. Five door-opening lines, one CTA: the free home value report.",
      },
      {
        id: "act-2",
        kind: "shipped",
        createdAt: daysAgo(2),
        message:
          "Walkthrough script filed for 31245 Sagecrest Way. Film Saturday morning, post before the open house.",
      },
      {
        id: "act-3",
        kind: "shipped",
        createdAt: hoursAgo(6),
        message:
          "27810 Juniper Bend staged as coming soon. Photos Thursday; generate the walkthrough now so it drops the same day.",
      },
    ],
    integrations: [
      {
        id: "int-fub",
        name: "Follow Up Boss",
        category: "crm",
        description: "Sync buyer leads and open house sign-ins both ways.",
        connected: false,
      },
      {
        id: "int-kvcore",
        name: "kvCORE",
        category: "crm",
        description: "Push desk leads into the brokerage pipeline.",
        connected: false,
      },
      {
        id: "int-crmls",
        name: "CRMLS",
        category: "mls",
        description: "Pull listing data and status straight from the MLS.",
        connected: false,
      },
      {
        id: "int-zillow",
        name: "Zillow Premier Agent",
        category: "mls",
        description: "Route portal inquiries into the desk within minutes.",
        connected: false,
      },
      {
        id: "int-canva",
        name: "Canva",
        category: "marketing",
        description: "Send flyer copy into your branded templates.",
        connected: false,
      },
      {
        id: "int-meta",
        name: "Meta Ads",
        category: "marketing",
        description: "Run the just-listed ad sets the desk drafts.",
        connected: false,
      },
      {
        id: "int-mailchimp",
        name: "Mailchimp",
        category: "comms",
        description: "Monthly farm newsletter and drip sequences.",
        connected: false,
      },
      {
        id: "int-twilio",
        name: "Twilio",
        category: "comms",
        description: "Five-minute first-touch texts to new leads.",
        connected: false,
      },
    ],
    clients: [
      {
        id: "cl-ruiz",
        name: "Marisol & Andre Ruiz",
        kind: "first-time",
        stage: "preapproval",
        phone: "951-555-0142",
        email: "marisol.ruiz@example.com",
        budgetMin: 480000,
        budgetMax: 560000,
        cities: ["Menifee", "Winchester"],
        beds: 3,
        timeline: "Wants keys before the school year",
        preapproved: false,
        lender: "Waiting on the letter from Pacific Trust",
        source: "Buyer-programs flyer",
        notes:
          "First home. Nervous about the down payment — walk them through assistance programs and the 3.99% builder rate.",
        savedHomes: [
          {
            id: "sh-ruiz-1",
            address: "29122 Sunswept Way",
            city: "Menifee",
            price: 524900,
            beds: 3,
            baths: 2,
            sqft: 1642,
            note: "Corner lot, no HOA. Their favorite so far.",
            savedAt: daysAgo(3),
          },
        ],
        touches: [
          { id: "ct-ruiz-1", note: "Buyer consult at the office. Set the search.", at: daysAgo(6) },
          { id: "ct-ruiz-2", note: "Texted the lender intro. They are gathering W2s.", at: daysAgo(2) },
        ],
        nextFollowUp: daysAgo(0),
        lastTouchAt: daysAgo(2),
        createdAt: daysAgo(8),
      },
      {
        id: "cl-nguyen",
        name: "Tracy Nguyen",
        kind: "buyer",
        stage: "touring",
        phone: "951-555-0177",
        budgetMin: 620000,
        budgetMax: 780000,
        cities: ["Temecula", "Murrieta"],
        beds: 4,
        timeline: "Move-up buyer, flexible on close",
        preapproved: true,
        lender: "Preapproved to $780k",
        source: "Juniper Bend inquiry",
        notes: "Needs a downstairs bedroom for her mom. Saw Juniper Bend online twice.",
        savedHomes: [],
        touches: [
          { id: "ct-ng-1", note: "Called after the Juniper Bend inquiry. Touring Saturday.", at: daysAgo(1) },
        ],
        nextFollowUp: daysAgo(-1),
        lastTouchAt: daysAgo(1),
        createdAt: daysAgo(4),
      },
      {
        id: "cl-okonkwo",
        name: "The Okonkwos",
        kind: "first-time",
        stage: "consult",
        email: "chidi.ok@example.com",
        budgetMin: 500000,
        budgetMax: 610000,
        cities: ["Temecula", "Murrieta"],
        beds: 3,
        timeline: "Six months out, renting now",
        preapproved: false,
        source: "Instagram DM",
        notes: "Asked what closing costs really run. Send the first-time buyer guide.",
        savedHomes: [],
        touches: [],
        nextFollowUp: daysAgo(2),
        createdAt: daysAgo(11),
      },
      {
        id: "cl-harmon",
        name: "Dale & Bev Harmon",
        kind: "seller",
        stage: "contingencies",
        phone: "951-555-0119",
        listingId: "ls-lakeshore",
        timeline: "Closing on the Lakeshore condo",
        source: "Past client referral",
        notes: "In escrow. Appraisal ordered; keep them posted twice a week.",
        savedHomes: [],
        touches: [
          { id: "ct-har-1", note: "Escrow opened. Sent the timeline one-pager.", at: daysAgo(5) },
        ],
        nextFollowUp: daysAgo(-2),
        lastTouchAt: daysAgo(5),
        createdAt: daysAgo(26),
      },
      {
        id: "cl-vega",
        name: "Priya Vega",
        kind: "past",
        stage: "closed",
        phone: "951-555-0163",
        listingId: "ls-vistadelsol",
        source: "Vista Del Sol sale",
        notes: "Closed in the spring. Anniversary card and a market update.",
        savedHomes: [],
        touches: [
          { id: "ct-vega-1", note: "Dropped off the closing gift.", at: daysAgo(38) },
        ],
        nextFollowUp: daysAgo(-9),
        lastTouchAt: daysAgo(38),
        createdAt: daysAgo(60),
      },
    ],
    posters: [
      {
        id: "poster-sagecrest",
        listingId: "ls-sagecrest",
        kind: "just-listed",
        eyebrow: "Just listed in Temecula",
        headline: "The backyard everyone asks me for",
        bullets: [
          "4 bed, 3 bath, 2,650 sqft on a quiet cul-de-sac",
          "Pool and spa, remodeled kitchen with a quartz island",
          "Three-car garage and room to grow",
          "Open Saturday and Sunday, 12 to 3",
        ],
        cta: "Scan for the private tour link, or text Leslie at 951-237-4991",
        createdAt: daysAgo(2),
      },
    ],
    messages: [
      {
        id: "sms-seed-1",
        to: "951-237-4991",
        body: "ListingDesk: Tracy Nguyen just came in as a new lead on 27810 Juniper Bend. Answer inside five minutes; the follow-up is drafting.",
        event: "lead",
        status: "queued",
        detail: "Connect Twilio to deliver for real.",
        createdAt: hoursAgo(6),
      },
    ],
    chat: [
      {
        id: "msg-checkin-1",
        role: "assistant",
        content:
          "Morning, Leslie. Juniper Bend's photos land Thursday. Want the walkthrough filmed and the just-listed set posted the same day? The script is one click away.",
        createdAt: hoursAgo(9),
      },
      {
        id: "msg-checkin-2",
        role: "assistant",
        content:
          "The Sagecrest walkthrough is approved and sitting in your Social drafts. Post it before Saturday's open house and comment-gate the showing link?",
        createdAt: hoursAgo(2),
      },
    ],
    settings: {
      notifyPhone: "951-237-4991",
      notifyPrefs: ["lead", "walkthrough", "followup"],
    },
    metrics: {
      leadsThisWeek: 9,
      showings: 5,
      walkthroughs: 6,
      updatedAt: new Date(now).toISOString(),
    },
  };
}
