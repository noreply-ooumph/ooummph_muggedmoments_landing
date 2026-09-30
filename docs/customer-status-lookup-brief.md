# MuggedMoments — Customer "Check My Status by Phone" Brief

## Role and mandate

Act as a senior full-stack engineer (30+ yrs) implementing this brief against a live,
production-tracked Next.js 16 / Prisma / PostgreSQL codebase. Every fact below was
verified by reading the actual current files immediately before this brief was
written. Read each file fresh, immediately before editing it.

## Confirmed decision (already made, do not re-litigate)

Phone-only lookup, no verification step — explicitly chosen by the operator after
being shown the tradeoff (anyone who knows/guesses a customer's phone number can see
all of that customer's event requests, budgets, and vendor chats). This matches the
same simplicity already chosen for vendor login. Do not add an OTP/verification step
to this feature — that was considered and explicitly declined.

## Correction from the casual plan — read before Phase 3

The casual plan's item 5 ("a visible 'why these vendors' note … surfacing even a
short version of the per-vendor eligibility reasons") is not quite buildable as
described, and building it as literally described would violate a rule already
enforced elsewhere in this codebase. Verified in
`src/domain/matching/publicMatchService.ts`'s own header comment: match `reasons`
(`CITY_MISMATCH`, `SERVICE_MATCH`, etc.) are internal debugging strings that
**"never reach the customer"** — by design, `toPublicMatches()` filters to
`eligible: true` rows only and drops `reasons` entirely before the shape reaches any
customer-facing code. Two consequences:
1. Do not add `reasons` (or the raw MATCHING_REASONS codes) to `PublicVendorMatch` or
   any customer-facing API response. That would undo a rule stated explicitly in
   that file for a reason (avoiding this platform's own version of an "unexplainable
   AI-style black box" complaint, ironically by never showing the internal codes at
   all).
2. Because eligibility is binary (`evaluateCompatibility()` requires city match +
   event-type match + service match together, or the vendor is filtered out before
   the customer ever sees it), **every match a customer is shown already satisfies
   the exact same three criteria** — there is nothing differentiating to say
   per-vendor. What's honest and buildable is **one general, static explainer
   sentence** near the match list (not computed per-vendor, not read from
   `reasons`): something like *"These vendors matched because they serve your city,
   handle your event type, and offer the services you requested."* Phase 3 below
   builds exactly this, nothing more.

## Non-negotiable guardrails

1. **Additive only.** Every existing `/status/[publicLeadId]` behavior (quotes,
   messaging, booking-request flow, `MatchList`, `StatusBadge` usage) must work
   identically after this. This brief adds a NEW page and NEW route that link INTO
   the existing status page — it does not modify what that page does once reached,
   except for Phase 3's one static sentence.
2. **Normalize phone numbers before matching, don't compare raw strings.**
   `Lead.phone` is stored exactly as typed at submission (verified: no normalization
   happens anywhere in the lead-creation path) — a customer could have submitted
   `+91 98765 43210` once and `9876543210` another time. Strip non-digits and
   compare the last 10 digits (same normalization technique already used in this
   session's MSG91 integration) — an exact-string match would silently miss a
   customer's own past requests.
3. **Phone in the request body, never a URL query param** (keeps it out of server
   access logs and browser history).
4. **Verify, don't assume.** `npx tsc --noEmit` and `npm run test` after every task.
   Do not run `npm run build` while `npm run dev` is running elsewhere (documented
   root cause of a real `.next` corruption earlier this project).
5. **Live-verify with real data**: submit 2+ real leads through the actual form using
   the *same* phone number in two different formats (e.g. `+91 98765 43210` and
   `9876543210`), then confirm the new lookup finds both despite the formatting
   difference. Also verify a phone number with zero leads shows the honest empty
   state, not a silent blank screen.

## Confirmed already working — do not re-build

- `/status/[publicLeadId]` (`StatusPageClient.tsx`) — the full detail view (quotes,
  messaging, booking flow, `MatchList`). This brief's new summary list links INTO
  this page; it does not duplicate any of what that page renders.
- `getLeadByPublicId()` in `services/lead/leadService.ts` — the existing
  single-lead detail query. Do not reuse this for the new summary list (it does
  expensive nested matches/quotes/bookings queries per lead — fine for one lead,
  wasteful for potentially many). The new summary function is intentionally lighter.
- `StatusBadge` (`src/components/ui/StatusBadge.tsx`) — reuse for the summary
  cards' status display, don't invent a new badge style.
- `vendorPhoneField` in `src/lib/validation/schemas.ts` (line ~207) — already the
  exact regex `CreateLeadSchema.phone` uses, documented as reused for that reason.
  Reuse it for the new lookup schema too rather than writing a third copy of the
  same regex. It's currently named for vendor auth specifically — either import it
  as-is (name mismatch, harmless) or rename it to something neutral like
  `phoneField` and update its two existing call sites (`VendorLoginSchema`,
  `VendorRegisterSchema`) to match. Your call; state which you did in the report.
- `PublicSiteHeader.tsx` and `Header.tsx` — both already exist with working nav.
  This brief adds one link to each, not a redesign.

## Task breakdown

### 1. Nav links

Add a "Check My Status" link to both `Header.tsx`'s nav (alongside "Event Types" /
"How It Works" / etc.) and `PublicSiteHeader.tsx`'s nav (alongside "Explore
Vendors"). Point both at the new page from Task 3.

### 2. Domain logic — new function in `services/lead/leadService.ts`

Add `getLeadSummariesByPhone(phone: string)`, mirroring the file's existing
conventions (it already has `getLeadByPublicId`, `listLeadsForAdmin`, etc. — match
the existing style). Normalize the input phone (strip non-digits, take last 10) and
compare against every stored `Lead.phone` normalized the same way — since Prisma
can't normalize in a WHERE clause against arbitrarily-formatted stored strings, this
likely means fetching a reasonably-scoped candidate set and filtering in
application code, OR storing/comparing via a computed last-10-digits substring
match at the query level if you can express it cleanly in Prisma — your call, state
which approach and why. Return a lightweight summary shape only:

```ts
interface LeadSummary {
  publicLeadId: string;
  eventType: string;
  city: string;
  eventDate: string | null;
  status: string;
  createdAt: string;
  matchCount: number;
  quoteCount: number;
}
```

Order newest-first (`createdAt desc`).

### 3. New route — `POST /api/leads/by-phone`

Mirror the existing `/api/leads/[publicLeadId]` route's structure/error-shape
conventions. Validate the phone field with the schema from Task 4, call
`getLeadSummariesByPhone()`, return `{ leads: LeadSummary[] }` (empty array, not an
error, when there are zero matches — a phone number with no requests is not itself
invalid input).

### 4. Validation schema

Add a schema (reusing `vendorPhoneField`/`phoneField` per the note above) for the
by-phone lookup request body.

### 5. New page — `/my-requests` (or a name of your choice — state it in the report)

Phone input → submit → calls the new route → renders `LeadSummary[]` as cards:
event type, city, event date (or "date not set"), a `StatusBadge` for `status`,
`matchCount` vendors matched, `quoteCount` quotes received, linking to
`/status/<publicLeadId>`. Empty state: "We couldn't find any event requests for that
number." Wrap in `PublicSiteHeader` for consistency with `/vendors` and
`/vendors/[vendorId]`.

### 6. Mobile pass on `/status/[publicLeadId]`

This is your highest-traffic customer page and has never had a real mobile-width
verification pass (the vendor dashboard did, earlier this session, and found 3 real
bugs there — this page has had none). Use the browser's mobile viewport preset,
click through the full page with a real lead that has multiple quotes, and check
specifically for: the `QuoteComparisonTable`, the per-vendor `MessageThread`, and
the `BookingRequestFlow` UI at narrow widths. Fix only what you actually find broken
— this is a verification-and-targeted-fix pass, not a redesign.

### 7. "Why these vendors matched" explainer

In `MatchList.tsx`'s `ROUTED && matches.length > 0` branch (~line 53), add one
static sentence near the "{matches.length} Matched Vendor(s)" heading — see the
Correction section above for the exact honest framing and why it must be a single
general sentence, not per-vendor, and must not read from or expose `reasons`.

## Explicit out of scope for this brief

- Any OTP/verification step on the phone lookup (explicitly decided against — see
  "Confirmed decision" above)
- WhatsApp status-link delivery, new-quote WhatsApp/SMS notifications (both
  blocked on a real WhatsApp/SMS provider — same blocker flagged all session, not
  resolved by this brief)
- Filter/sort on the new requests list (explicitly deferred as day-one-irrelevant)
- Any change to `PublicVendorMatch`'s shape to include `reasons` (see Correction
  section — this is a hard no, not a stylistic preference)
- Any change to `/admin/*` or vendor-side flows

## Stop conditions — ask rather than guess

- If normalizing phone comparison can't be expressed reasonably in a single Prisma
  query and requires fetching a large candidate set to filter in memory — say so
  and describe the approach you chose, rather than silently accepting a query that
  could scale badly
- If you're about to add per-vendor differentiated "why matched" text, or expose
  any `MATCHING_REASONS` value to a customer-facing response — stop, re-read the
  Correction section, that's the one thing this brief explicitly forbids

## Final report format

Per task: files changed, `tsc --noEmit` + `npm run test` result, and the real
verification you performed — for Task 2/3/5, the actual two-different-phone-formats
test described in guardrail 5; for Task 6, screen-by-screen mobile notes; for Task
7, a screenshot or description of the explainer sentence rendering correctly.
