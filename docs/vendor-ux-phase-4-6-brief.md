# MuggedMoments — Vendor Dashboard UX Brief (Phases 4–6)

## Role and mandate

Act as a senior full-stack engineer (30+ yrs) implementing this brief against a live,
production-tracked Next.js 16 / Prisma / PostgreSQL codebase. This is a direct
continuation of the Phase 1–3 brief already executed and verified this session (shared
`VendorDashboardShell` + `layout.tsx`, `StatusBadge` component, filter tabs on the two
list pages, quote builder table/formatting). Every fact below was verified by reading
the actual current files immediately before this brief was written. You must do the
same: **read each file fresh, immediately before editing it**. Do not trust this
document's line numbers if the file has since changed — re-read and re-locate.

## Non-negotiable guardrails

1. **Additive/refactor only, never destructive.** Everything under "Confirmed already
   working — do not re-build" must still work, byte-for-byte in behavior, after your
   changes.
2. **No invented facts.** Do not invent copy, color values, or business rules. If a
   task needs a decision this brief doesn't make, stop and ask.
3. **No scope creep.** This brief deliberately excludes one file
   (`components/quotes/QuoteCard.tsx`) that looks related but isn't — see Phase 4
   below for why. Do not touch it.
4. **Verify, don't assume.** Run `npx tsc --noEmit` and `npm run test` after every
   task — both clean before moving on. Do NOT run `npm run build` if `npm run dev` is
   running in another terminal (confirmed root cause of a real cache corruption
   earlier this session — the two share `.next`). Use `tsc --noEmit` instead; it
   doesn't touch `.next` and is safe to run alongside a live dev server.
5. **Live-verify visually.** Every phase needs a real browser click-through with real
   seeded data, not just green tests — this session found and fixed several things
   (filter tabs, ₹ formatting) that only became obvious once actually clicked through
   with a vendor that had varied real data (11 opportunities, 7 booking requests,
   phone `+919876500001`, vendor id `526bbdd9-8307-426a-a81d-a922647859a2` — reused for
   this same purpose last session; if it no longer exists, find another vendor with
   multiple opportunities/booking-requests across different statuses the same way:
   query `vendorOpportunity`/`bookingRequest` grouped by vendorId and status).

## Confirmed already working — do not re-build

- `StatusBadge` (`src/components/ui/StatusBadge.tsx`) already exists, with tones
  `amber | zinc | emerald | red | gray` mapped to exact class strings. It is already
  used in: `VendorDashboardShell.tsx` (verification badge in the header),
  `OpportunityListClient.tsx`, `BookingRequestListClient.tsx`. Do not create a second
  badge component — extend usage of this one.
- The three action components (`OpportunityActions.tsx`, `BookingRequestActions.tsx`,
  `CancelBookingAction.tsx`) already have a `submitting` boolean that disables buttons
  mid-request, and an error banner pattern (`bg-red-950/40 border-red-900 text-red-400
  rounded-md p-3`) shown on failure. This is real, working error handling — Phase 6
  only adds a loading label and success acknowledgment, it does not touch the
  error-handling logic.
- `QuoteBuilderClient.tsx`'s `startRevision()` already shows a loading LABEL while
  submitting: `{revising ? "Starting revision..." : "Revise Quote"}`. This is the
  existing pattern to extend to the other three action components in Phase 6, not a
  new pattern to invent.

## Phase 4 — Consolidate remaining status displays into `StatusBadge`

**Scope correction from the casual plan:** "availability state" is NOT a vendor
dashboard badge inconsistency. It was traced to
`src/components/quotes/QuoteCard.tsx` (`AVAILABILITY_LABEL`/`AVAILABILITY_STYLE`
consts, lines ~14–26) — a **customer/buyer-facing** component under
`src/components/quotes/`, not anywhere under `src/app/vendor/*`. It has its own
internally-consistent style already (`bg-emerald-500/10 text-emerald-400
border-emerald-500/30` — a different opacity/border convention than the vendor side's
`bg-emerald-950/40 border-emerald-900 text-emerald-400`, but consistent within its own
surface). **Do not touch this file** — merging a buyer-facing display convention into
the vendor-facing `StatusBadge` is a separate, larger decision (it would mean picking
one visual convention as canonical across two different audiences) that this brief
does not authorize. Flag it in your report as a possible future follow-up, nothing more.

The real, verified remaining vendor-dashboard inconsistencies:

1. **`src/app/vendor/dashboard/page.tsx`** (lines ~32–47 as read this session) still
   has its own local `statusCopy` map and renders the verification badge as a plain
   `<div className={...}>`, NOT via `StatusBadge` — even though
   `VendorDashboardShell.tsx` already shows the same vendor's verification status via
   `StatusBadge` in the header, one level up. Replace the page body's inline div with
   `<StatusBadge label={status.label} tone={...} />`, mapping PENDING→amber,
   VERIFIED→emerald, REJECTED→red (matching `VendorDashboardShell`'s existing
   `VERIFICATION_BADGE` map exactly — do not invent new tones).
2. **`src/app/vendor/dashboard/opportunities/[opportunityId]/page.tsx`** — status is
   currently plain text: `<p>{STATUS_LABEL[currentOpportunity.status]}</p>` (its
   `STATUS_LABEL` is `Record<string, string>`, not `{label, tone}` — a 6-key map:
   SENT/VIEWED/INTERESTED/DECLINED/QUOTE_PENDING/QUOTE_SUBMITTED). Convert this to a
   `StatusBadge`, extending its map to include `tone` per key. Reuse the same 4 tone
   choices already established for SENT/VIEWED/INTERESTED/DECLINED in
   `OpportunityListClient.tsx`; for the 2 keys that page doesn't have
   (QUOTE_PENDING/QUOTE_SUBMITTED), pick tones consistent with their meaning
   (QUOTE_PENDING → amber, matching "in progress"; QUOTE_SUBMITTED → emerald, matching
   "done") — state this choice plainly in your report since it's a new mapping, not
   copied from an existing source.
3. **`src/app/vendor/dashboard/booking-requests/[bookingRequestId]/page.tsx`** — same
   issue, plain text `STATUS_LABEL[bookingRequest.status]` (5 keys:
   REQUESTED/UNDER_REVIEW/ACCEPTED/REJECTED/EXPIRED — these 5 already have an exact
   tone mapping in `BookingRequestListClient.tsx`, reuse it verbatim, do not invent
   new tones here).

**Acceptance criteria:** navigate to a vendor dashboard, an opportunity detail page,
and a booking-request detail page, all with real data — status displays should look
visually consistent (same badge shape/weight) with the list pages' badges, not a
mix of plain text and pills.

## Phase 5 — Mobile verification pass

`VendorDashboardShell.tsx` already has a `md:hidden` mobile nav row (built during
Phase 1, never tested at phone width). This phase is verification-first, fixes second:

1. Use the browser's mobile viewport preset (375×812 or similar) and click through:
   Dashboard → Opportunities (with filter tabs) → Booking Requests (with filter tabs)
   → a detail page → Edit Profile → the Quote Builder (with the new line-items table
   from Phase 3).
2. For each screen, check specifically for: horizontal scroll/overflow, the filter
   tab row's `overflow-x-auto` actually working (tabs shouldn't wrap awkwardly or get
   clipped), the quote builder's line-items table (`grid grid-cols-[1fr_auto_auto]`)
   not overflowing on a narrow screen, and the header's vendor name/badge not
   overlapping the nav row.
3. Fix only what you actually find broken — do not preemptively restyle anything that
   already renders acceptably at 375px. This is a verification pass with targeted
   fixes, not a mobile redesign.

**Acceptance criteria:** report, screen by screen, what you saw at mobile width —
including anything that was already fine, not just what you fixed. If you have no
browser access in your environment, say so explicitly rather than claiming a visual
check you didn't perform.

## Phase 6 — Action feedback (loading label + success acknowledgment)

**Scope correction from the casual plan:** these buttons are not silent — they already
disable during submission and show real errors on failure (see "Confirmed already
working" above). The actual gap is narrower than "no feedback at all":

1. **Loading label** — add the same pattern `QuoteBuilderClient.tsx`'s
   `startRevision()` already uses, to the other three action components:
   - `OpportunityActions.tsx`: `submitting ? "Saving..." : "I'm Interested"` /
     `submitting ? "Saving..." : "Can't Take This"` (or similar — exact wording your
     call, keep it short)
   - `BookingRequestActions.tsx`: same idea for Accept/Confirm Rejection
   - `CancelBookingAction.tsx`: same idea for Confirm Cancellation
2. **Success acknowledgment** — **do not introduce a toast/snackbar library or any
   new dependency.** No toast system exists anywhere in this codebase today, and
   adding one is a real architecture decision, not a small UI fix — if you believe one
   is warranted, stop and describe the tradeoff rather than adding a dependency
   unilaterally. Instead, use the same local-state pattern these components already
   use for errors: add a `success: boolean` state, show a brief inline banner (reuse
   the exact class shape already used for errors, swapped to the emerald tones
   `StatusBadge` already defines — `bg-emerald-950/40 border-emerald-900
   text-emerald-400`) for ~1.5–2 seconds before `router.refresh()` fires, so the user
   sees explicit confirmation instead of the action silently succeeding into a
   re-rendered page.

**Acceptance criteria:** click Accept/Reject/Cancel/Interested/Decline on real
opportunities/booking-requests in a real browser and confirm you see (a) the button
label change while the request is in flight, (b) a brief success acknowledgment before
the page reflects the new state. Do not claim this works from reading the code alone —
this class of change is exactly the kind of thing that looks right in a diff and wrong
on screen (timing, state resets, etc.).

## Explicit out of scope for this brief

- `src/components/quotes/QuoteCard.tsx` / `QuoteComparisonTable.tsx` (buyer-facing,
  see Phase 4)
- Any new toast/snackbar dependency (see Phase 6)
- Any change to `/admin/*` or business logic in `domain/*` or Prisma schema
- A full mobile redesign — Phase 5 is verify-and-patch, not rebuild

## Stop conditions — ask rather than guess

- If you find a status value in the two detail pages' maps that has no obvious tone
  precedent anywhere else in the codebase, state your chosen tone explicitly in the
  report rather than silently picking one (see QUOTE_PENDING/QUOTE_SUBMITTED above —
  this is the one place in this brief where you're making a new call, not copying an
  existing one).
- If Phase 5's mobile check surfaces something that looks like it needs more than a
  targeted CSS fix (e.g., the quote builder table genuinely doesn't work at any
  reasonable mobile width without restructuring) — stop and describe it rather than
  attempting a redesign under this brief's scope.
- If you're tempted to add any new npm package for Phase 6 — stop, this brief
  explicitly says not to.

## Final report format

Same as the Phase 1–3 brief: per phase, what changed (file list), `tsc --noEmit` +
`npm run test` result, and the exact real-data browser steps you took to confirm it —
screenshots or described click-throughs, not just "should work."
