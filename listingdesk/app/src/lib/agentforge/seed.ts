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
        listingId: "ls-33721verbena",
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
        listingId: "ls-33721verbena",
        stage: "contacted",
        notes: "Pre-approved to $700k. Loved the backyard; asked about schools.",
        createdAt: daysAgo(2),
      },
      {
        id: "lead-cho",
        name: "Marcus Cho",
        source: "Zillow inquiry",
        email: "m.cho@example.com",
        listingId: "ls-32348yosemitel",
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
        id: "ls-25018cinnabarc",
        address: "25018 Cinnabar Ct",
        city: "Wildomar",
        price: 950000,
        beds: 6,
        baths: 4.5,
        sqft: 3761,
        lat: 33.6000203,
        lng: -117.2232363,
        features:
          "Coming Soon: Welcome home to this stunning Estrella Hills luxury residence. From th",
        status: "coming-soon",
        leadCount: 3,
        photoUrl: "/assets/home-25018-cinnabar-ct-wildomar-0.jpg",
        photos: [
          "/assets/home-25018-cinnabar-ct-wildomar-0.jpg",
          "/assets/home-25018-cinnabar-ct-wildomar-1.jpg",
          "/assets/home-25018-cinnabar-ct-wildomar-2.jpg",
          "/assets/home-25018-cinnabar-ct-wildomar-3.jpg",
          "/assets/home-25018-cinnabar-ct-wildomar-4.jpg",
          "/assets/home-25018-cinnabar-ct-wildomar-5.jpg",
          "/assets/home-25018-cinnabar-ct-wildomar-6.jpg",
          "/assets/home-25018-cinnabar-ct-wildomar-7.jpg",
        ],
        sourceUrl: "https://www.redfin.com/CA/Wildomar/25018-Cinnabar-Ct-92595/home/8167786",
        notes:
          "Live MLS listing · MLS# DW26174378 — real photos pulled from the listing. Her own shoot and walkthrough go on top.",
        createdAt: daysAgo(6),
      },
      {
        id: "ls-33721verbena",
        walkthroughDocumentId: "doc-walk-verbena",
        address: "33721 Verbena",
        city: "Murrieta",
        price: 739900,
        beds: 5,
        baths: 4.5,
        sqft: 4063,
        lat: 33.6298516,
        lng: -117.1529036,
        features:
          "Welcome to this spacious 4,063-sq-ft entertainer’s home on one of the larger lots",
        status: "active",
        leadCount: 7,
        photoUrl: "/assets/home-33721-verbena-murrieta-0.jpg",
        photos: [
          "/assets/home-33721-verbena-murrieta-0.jpg",
          "/assets/home-33721-verbena-murrieta-1.jpg",
          "/assets/home-33721-verbena-murrieta-2.jpg",
          "/assets/home-33721-verbena-murrieta-3.jpg",
          "/assets/home-33721-verbena-murrieta-4.jpg",
          "/assets/home-33721-verbena-murrieta-5.jpg",
          "/assets/home-33721-verbena-murrieta-6.jpg",
        ],
        sourceUrl: "https://www.redfin.com/CA/Murrieta/33721-Verbena-Ave-92563/home/8161403",
        notes:
          "Live MLS listing · MLS# SW26174777 — real photos pulled from the listing. Her own shoot and walkthrough go on top.",
        createdAt: daysAgo(2),
      },
      {
        id: "ls-33455gypsumst",
        address: "33455 Gypsum St",
        city: "Menifee",
        price: 825000,
        beds: 7,
        baths: 4.0,
        sqft: 4041,
        lat: 33.6342954,
        lng: -117.150463,
        features:
          "*  *  * PAID OFF SOLAR + HIGHLY UPGRADED + LOW HOA *  *  *  Welcome to 33455 Gypsum Stre",
        status: "active",
        leadCount: 4,
        photoUrl: "/assets/home-33455-gypsum-st-menifee-0.jpg",
        photos: [
          "/assets/home-33455-gypsum-st-menifee-0.jpg",
          "/assets/home-33455-gypsum-st-menifee-1.jpg",
          "/assets/home-33455-gypsum-st-menifee-2.jpg",
          "/assets/home-33455-gypsum-st-menifee-3.jpg",
          "/assets/home-33455-gypsum-st-menifee-4.jpg",
          "/assets/home-33455-gypsum-st-menifee-5.jpg",
          "/assets/home-33455-gypsum-st-menifee-6.jpg",
          "/assets/home-33455-gypsum-st-menifee-7.jpg",
        ],
        sourceUrl: "https://www.redfin.com/CA/Menifee/33455-Gypsum-St-92584/home/6671409",
        notes:
          "Live MLS listing · MLS# IG26180522 — real photos pulled from the listing. Her own shoot and walkthrough go on top.",
        createdAt: daysAgo(9),
      },
      {
        id: "ls-32348yosemitel",
        address: "32348 Yosemite Ln",
        city: "Temecula",
        price: 619900,
        beds: 5,
        baths: 2.5,
        sqft: 3806,
        lat: 33.4566746,
        lng: -117.0951109,
        features:
          "Beautiful South Temecula home located in the highly desirable Redwood Collection of",
        status: "pending",
        leadCount: 11,
        photoUrl: "/assets/home-32348-yosemite-ln-temecula-0.jpg",
        photos: [
          "/assets/home-32348-yosemite-ln-temecula-0.jpg",
          "/assets/home-32348-yosemite-ln-temecula-1.jpg",
          "/assets/home-32348-yosemite-ln-temecula-2.jpg",
          "/assets/home-32348-yosemite-ln-temecula-3.jpg",
          "/assets/home-32348-yosemite-ln-temecula-4.jpg",
          "/assets/home-32348-yosemite-ln-temecula-5.jpg",
          "/assets/home-32348-yosemite-ln-temecula-6.jpg",
          "/assets/home-32348-yosemite-ln-temecula-7.jpg",
        ],
        sourceUrl: "https://www.redfin.com/CA/Temecula/32348-Yosemite-Ln-92592/home/12275324",
        notes:
          "Live MLS listing · MLS# SW20089153 — real photos pulled from the listing. Her own shoot and walkthrough go on top.",
        createdAt: daysAgo(21),
      },
      {
        id: "ls-45027soniadr",
        address: "45027 Sonia Dr",
        city: "Lake Elsinore",
        price: 685000,
        beds: 5,
        baths: 3.0,
        sqft: 3081,
        lat: 33.7048721,
        lng: -117.3192239,
        features:
          "5 bed, 3.0 bath, 3081 sqft",
        status: "sold",
        leadCount: 0,
        photoUrl: "/assets/home-45027-sonia-dr-lake-elsinore-0.jpg",
        photos: [
          "/assets/home-45027-sonia-dr-lake-elsinore-0.jpg",
        ],
        sourceUrl: "https://www.redfin.com/CA/Lake-Elsinore/45027-Sonia-Dr-92532/home/8161228",
        notes:
          "Live MLS listing · MLS# CV26085207 — real photos pulled from the listing. Her own shoot and walkthrough go on top.",
        createdAt: daysAgo(34),
      },
    ],
    tasks: [
      {
        id: "t-juniper-posts",
        title: "Just-listed post set for 25018 Cinnabar Ct",
        description:
          "Instagram, Facebook, and Nextdoor versions. Lead with paid-off solar and RV parking; coming-soon framing until Thursday photos.",
        kind: "content",
        status: "queued",
        tags: ["CONTENT", "THURSDAY"],
        listingId: "ls-25018cinnabarc",
        createdAt: hoursAgo(8),
      },
      {
        id: "t-openhouse-followup",
        title: "Follow up with Sunday open house sign-ins",
        description:
          "Nine sign-ins at Verbena Way. Draft a text and email for each bucket: pre-approved buyers, neighbors, and just-looking. Mention offers review Monday.",
        kind: "followup",
        status: "queued",
        tags: ["FOLLOWUP"],
        listingId: "ls-33721verbena",
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
        id: "doc-walk-verbena",
        title: "Walkthrough: 33721 Verbena",
        kind: "walkthrough",
        listingId: "ls-33721verbena",
        approval: "approved",
        videoUrl: "/assets/verbena-walkthrough.mp4",
        createdAt: daysAgo(4),
        content: `# Walkthrough: 33721 Verbena, Murrieta
5 bed · 4.5 bath · 4,063 sqft · $739,900 — cut from the listing's own photos of the house.

## Hook (0:00-0:03)
Spoken: "Four thousand square feet in Murrieta, and nobody has lived in it yet."
On screen: 4,063 SQFT · $739,900

## Shot list
1. Approach — push in on the front elevation, 5s. "Three-car garage, stone accents, and that yellow front door."
2. Entry — walk into the great room, 5s. "You step in and the whole first floor opens up."
3. Great room — glide toward the windows, 5s. "Wide-plank floors run the length of it."
4. Kitchen — lateral dolly past the island, 5s. "White cabinets, quartz island, gas range."
5. Family room — push in on the fireplace, 5s. "The kitchen looks straight into the family room."
6. Downstairs bed and bath — 5s. "A bedroom and full bath on this floor. That is the one buyers ask for."
7. Stairs — tilt up, 5s. "Upstairs there is a second living space."
8. Loft — pan across the built-ins, 5s. "Built-in shelving, room for everybody."
9. Primary suite — reveal, 5s. "The primary sits at the back, away from the street."
10. Backyard — wide, 5s. "Big lot, blank canvas, ready for whatever they want back here."

## Captions (five words max)
4,063 sqft · Bed and bath downstairs · Kitchen opens to family · Loft upstairs · Murrieta $739,900

## Music and pacing
Warm and unhurried. Cut when the camera settles, never mid-move.

## Post copy
5 bed, 4.5 bath, 4,063 sqft in Murrieta at $739,900. Downstairs bedroom and full bath, kitchen open to the family room, loft upstairs. Comment TOUR and I'll send the full walkthrough. #murrietahomes #temeculavalley #realestate

## 30-second cutdown
Shots 1, 2, 4, 5, 8 — end on the price card.

## CTA
"Want to see it before the weekend? Comment TOUR and I'll text you times."
`,
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
          "Walkthrough script filed for 33721 Verbena. Film Saturday morning, post before the open house.",
      },
      {
        id: "act-3",
        kind: "shipped",
        createdAt: hoursAgo(6),
        message:
          "25018 Cinnabar Ct staged as coming soon. Photos Thursday; generate the walkthrough now so it drops the same day.",
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
        source: "Cinnabar Ct inquiry",
        notes: "Needs a downstairs bedroom for her mom. Saw Cinnabar Ct online twice.",
        savedHomes: [],
        touches: [
          { id: "ct-ng-1", note: "Called after the Cinnabar Ct inquiry. Touring Saturday.", at: daysAgo(1) },
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
        listingId: "ls-32348yosemitel",
        timeline: "Closing on the Yosemite condo",
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
        listingId: "ls-45027soniadr",
        source: "Sonia Dr sale",
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
        listingId: "ls-33721verbena",
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
        body: "ListingDesk: Tracy Nguyen just came in as a new lead on 25018 Cinnabar Ct. Answer inside five minutes; the follow-up is drafting.",
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
          "Morning, Leslie. Cinnabar Ct's photos land Thursday. Want the walkthrough filmed and the just-listed set posted the same day? The script is one click away.",
        createdAt: hoursAgo(9),
      },
      {
        id: "msg-checkin-2",
        role: "assistant",
        content:
          "The Verbena walkthrough is approved and sitting in your Social drafts. Post it before Saturday's open house and comment-gate the showing link?",
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
