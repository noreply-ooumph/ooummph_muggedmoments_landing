/**
 * MuggedMoments — Landing Page Content Configuration
 *
 * ALL content marked [CONTENT_REQUIRES_APPROVAL] must be replaced
 * with business-approved copy before production launch.
 *
 * DO NOT display placeholder content as factual production information.
 * DO NOT invent customer counts, vendor counts, certifications, or testimonials.
 */

export const SITE_CONFIG = {
  siteName: "MuggedMoments",
  siteTagline: "Deterministic Event Vendor Matching Platform",
  siteUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  seo: {
    title: "Plan Your Event Online | Find Venues & Vendors – MuggedMoments",
    description:
      "Planning a wedding, birthday, corporate or college event? Tell us what you need and discover relevant venues and event professionals.",
    ogTitle: "Plan Your Event – MuggedMoments",
    ogDescription:
      "Tell us your event, budget, date and city. We'll match you with the right venues and vendors.",
    ogImage: "/og-image.png",
  },
} as const;

export const HERO_CONTENT = {
  badge: "Deterministic Vendor Matching Platform",
  title: "Planning an event?",
  titleHighlight: "Start here.",
  subtitle: "Tell us your event, budget, date and city. We'll help you discover the right venues and event professionals.",
  headline: "Find Top Vetted Vendors For Your Special Event",
  subheadline: "Direct, transparent matching with zero booking markup and zero spam.",
  primaryCta: "Plan My Event",
  secondaryCta: "Explore Vendors",
} as const;

export const EVENT_TYPES = [
  {
    slug: "wedding",
    title: "Weddings & Galas",
    icon: "💍",
    description: "Full-scale wedding photography, videography, decor, catering, and master coordinators.",
    popularServices: ["Photography", "Videography", "Catering", "Decor", "DJ/Music"],
  },
  {
    slug: "birthday",
    title: "Birthdays & Parties",
    icon: "🎉",
    description: "Milestone celebrations, private parties, photo booths, live bands, and setup pros.",
    popularServices: ["DJ/Music", "Photo Booth", "Catering", "Photography"],
  },
  {
    slug: "corporate",
    title: "Corporate Events",
    icon: "💼",
    description: "Product launches, annual summits, corporate galas, and professional media teams.",
    popularServices: ["Photography", "Videography", "Catering", "Event Coordinator"],
  },
];

export const PROCESS_STEPS = [
  {
    step: 1,
    title: "Share Your Vision",
    description: "Fill out our quick progressive form specifying city, event date, guest count, and service preferences.",
  },
  {
    step: 2,
    title: "Deterministic Engine Matching",
    description: "Our non-AI compatibility algorithm checks vendor coverage, verified availability, and budget tiers.",
  },
  {
    step: 3,
    title: "Direct Verified Connection",
    description: "Receive curated vendor matches directly via WhatsApp/phone with transparent pricing and zero middleman fee.",
  },
];

export const REASSURANCE_POINTS = [
  {
    icon: "🔒",
    title: "Zero Spam Guarantee",
    description: "Your contact details are shared ONLY with vendors that pass strict compatibility matching criteria.",
  },
  {
    icon: "✨",
    title: "Vetted Professionals",
    description: "Every creator on MuggedMoments undergoes rigorous portfolio, review, and reliability verification.",
  },
  {
    icon: "⚡",
    title: "Instant Status Tracking",
    description: "Get a unique MM-XXXXXXXX reference code to track matching status and vendor responses transparently.",
  },
  {
    icon: "💎",
    title: "100% Free for Hosts",
    description: "No hidden service fees, no markup on vendor pricing, and zero obligation to confirm.",
  },
];

export const FAQ_ITEMS: Array<{ question: string; answer: string }> = [
  {
    question: "Is MuggedMoments completely free for event organizers?",
    answer: "Yes, 100%! Finding and requesting quotes from verified vendors through MuggedMoments is entirely free with no hidden fees or markups.",
  },
  {
    question: "How does the vendor matching engine work?",
    answer: "Our matching engine evaluates exact dimensions: event location, event type, requested services, guest size, and date availability. It is strictly deterministic without biased paid placement.",
  },
  {
    question: "How soon will matched vendors contact me?",
    answer: "Once submitted, eligible vendors receive your lead details immediately. Most top-matched vendors respond within 1–4 hours.",
  },
  {
    question: "Can I save my progress and resume filling out the form later?",
    answer: "Yes! Your partial form progress is saved locally for 24 hours so you can resume anytime without losing your answers.",
  },
  // The items below are from the MuggedMoments Final Copy Deck (Section 5).
  // The deck originally marked 8 of its 11 answers with a 🔴 pending-decision
  // flag; 7 of those 8 are now unblocked following business confirmation of
  // the 9 decisions in Untitled.docx Section 1 (pricing free-for-buyers,
  // manual vendor verification, deterministic auto-matching with no manual
  // ops curation step, contact info withheld until connect, multi-vendor
  // comparison allowed, quote-acceptance-defines-booking with no payment
  // handling, WhatsApp as opt-in default not mandatory). One item — "How are
  // my details protected?" — stays out: the deck marks it as needing legal
  // sign-off specifically, which is a separate, still-unmet blocker from the
  // business decisions above.
  {
    question: "How does MuggedMoments work?",
    answer:
      "Tell us your event details — type, date, city, budget and the services you need. We match you with relevant, verified venues and vendors so you can compare and book.",
  },
  {
    question: "Is planning assistance free?",
    answer:
      "Yes, submitting your event requirement and getting matched with vendors is free for you.",
  },
  {
    question: "How are vendors verified?",
    answer:
      "Every vendor and venue completes a business and portfolio verification before being listed on MuggedMoments.",
  },
  {
    question: "How do I submit an event requirement?",
    answer:
      "Fill out the short form on this page with your event type, date, city, budget and required services — it takes under 2 minutes.",
  },
  {
    question: "Can I choose multiple vendors?",
    answer:
      "Yes, you can compare and connect with more than one vendor for the same requirement.",
  },
  {
    question: "How does vendor matching work?",
    answer:
      "We match your requirement against vendor category, location, availability and budget, then share it with relevant, verified vendors.",
  },
  {
    question: "Do vendors see my information?",
    answer:
      "Vendors see your event requirement details. Your contact information is shared only once you choose to connect with a vendor.",
  },
  {
    question: "How does booking work?",
    answer:
      "Once you've compared vendors, you confirm the one you'd like to book directly through MuggedMoments.",
  },
  {
    question: "What happens after I submit the form?",
    answer:
      "Our team reviews your requirement and reaches out — usually the same day — with matched options.",
  },
  {
    question: "Is WhatsApp mandatory?",
    answer:
      "WhatsApp is our default way of following up quickly, but you can ask to be contacted by call instead.",
  },
];

// Vendor-acquisition landing page (/join-as-vendor) content — reconciled across
// PRD v2.0, the Final Copy Deck, and the Positioning/Launch System doc. See the
// implementation brief for source-by-source sourcing of each field.
export const SELLER_LANDING_CONTENT = {
  heroHeadline:
    "Put your event business in front of people actively planning events.",
  primaryCta: "Get Listed",
  whyJoinIntro:
    "Get relevant demand, visibility and a profile people actually see.",
  benefits: [
    "Get discovered locally",
    "Showcase your portfolio",
    "Display your services",
    "Share your service area",
    "Receive relevant enquiries",
    "Build a stronger digital profile",
    "Expand your local reach",
  ],
  howItWorksSteps: [
    "Join",
    "Register",
    "Verify",
    "Build your profile",
    "Get leads",
    "Get booked",
  ],
  // No source document gives an exact trust-section sentence for this page — this
  // is new copy, deliberately vague rather than claiming a specific unverified
  // process, per the source docs' explicit "never say verified unless it happened"
  // guardrail.
  trustLine: "Every vendor profile goes through MuggedMoments' review process before going live.",
} as const;

export const SELLER_FAQ_ITEMS: Array<{ question: string; answer: string }> = [
  {
    question: "Who can join?",
    answer:
      "Photographers, venues, decorators, caterers, planners, DJs, artists, production companies and other event businesses.",
  },
  {
    question: "Is every application approved?",
    answer:
      "Applications are reviewed for category, service area, profile completeness and platform fit.",
  },
  {
    question: "Will I receive guaranteed leads?",
    answer:
      "No — enquiries depend on demand, category, location, profile quality and availability.",
  },
  {
    question: "What should I prepare?",
    answer:
      "Business details, portfolio images, services, pricing/starting price, locations served, and availability information.",
  },
];

export const FOOTER_CONTENT = {
  copyright: `© ${new Date().getFullYear()} MuggedMoments Inc. All rights reserved.`,
  links: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
} as const;
