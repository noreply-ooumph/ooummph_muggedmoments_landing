# MuggedMoments — Vendor Dashboard UX Brief (Phases 1–3)

## Role and mandate

Act as a senior full-stack engineer (30+ yrs) implementing this brief against a live,
production-tracked Next.js 16 / Prisma / PostgreSQL codebase. Every fact below was
verified by reading the actual current files immediately before this brief was written
— not assumed, not carried over from a stale summary. You must do the same: **read
each file fresh, immediately before editing it**, even if you (or an earlier session)
already read it once. Do not trust this document's line numbers if the file has since
changed — re-read and re-locate.

## Non-negotiable guardrails

1. **Additive/refactor only, never destructive.** Every piece of working logic listed
   under "Confirmed already working — do not re-build" must still work, byte-for-byte
   in behavior, after your changes. If a change requires touching one of those files,
   the diff must be minimal and behavior-preserving.
2. **No invented facts.** Do not invent color values, copy, business rules, or data
   shapes not already present in this codebase or explicitly specified below. If a
   task needs a decision this brief doesn't make, stop and ask rather than guess.
3. **No scope creep.** Do not "improve" anything not listed in the Task Breakdown,
   even if you notice something else that looks improvable. Flag it in your final
   report instead — do not fix it inline.
4. **Verify, don't assume.** After every task, run `npm run build` and `npm run test`
   (from `C:\Users\sarth\.gemini\antigravity-ide\scratch\muggedmoments`). Both must be
   clean before moving to the next task. Do NOT run `npm run build` while a `npm run
   dev` server is running in another terminal — the two processes share the `.next`
   folder and running both concurrently has already corrupted the dev cache once this
   session (fixed by killing the stale process and `rmdir /s /q .next`). If you need
   to verify a visual change, ask the operator to check their already-running dev
   server rather than starting your own.
5. **Live-verify visually, not just green tests.** For every phase, describe exactly
   what the operator should click through in their browser to confirm it, since unit
   tests do not cover Tailwind layout/visual regressions.

## Confirmed already working — do not re-build

Verified in this session by reading the live files. Do not treat these as gaps:
- `opportunities/page.tsx` and `booking-requests/page.tsx` **already have empty
  states** ("No opportunities yet." / "No booking requests yet.") — a prior casual
  read of this project mistakenly said otherwise; that was wrong and is corrected here.
- The quote builder's "Valid until" field is a real native `<input type="date">` — the
  "dd-mm-yyyy" appearance is Chrome's own placeholder rendering for an empty date
  input, not a bug or a fake text field. Do not "fix" this.
- `booking-requests/page.tsx` already formats its total correctly:
  `₹{calculateTotal(br.quoteVersion.lineItems).toLocaleString("en-IN")}` (line ~80).
  This is the pattern to match elsewhere, not a gap itself.
- Status badges already exist and are functionally correct in three places
  (`dashboard/page.tsx` PENDING/VERIFIED/REJECTED, `opportunities/page.tsx`
  SENT/VIEWED/INTERESTED/DECLINED, `booking-requests/page.tsx`
  REQUESTED/UNDER_REVIEW/ACCEPTED/REJECTED/EXPIRED) — each as a local
  `STATUS_LABEL` const map with `{label, className}` shape. The problem is
  duplication or three near-identical objects, not missing functionality.
- `LogoutButton.tsx` — a working client component (`POST /api/vendor/logout`,
  redirect to `/vendor`). Reuse it as-is inside the new shell; do not rewrite its logic.

## Files this touches (read each fresh before editing)

- `src/app/vendor/dashboard/page.tsx`
- `src/app/vendor/dashboard/opportunities/page.tsx`
- `src/app/vendor/dashboard/booking-requests/page.tsx`
- `src/app/vendor/dashboard/opportunities/[opportunityId]/quote/QuoteBuilderClient.tsx`
- `src/app/vendor/dashboard/LogoutButton.tsx` (read-only reference, reuse don't rewrite)
- `src/components/landing/Header.tsx` (read-only reference for brand tokens — amber-400/
  zinc-950/zinc-900/zinc-800 — do not import or modify this file itself; it is
  homepage-specific with an `onStartForm` prop that doesn't apply here)

New files you are expected to create:
- `src/app/vendor/dashboard/VendorDashboardShell.tsx` (or `.tsx` + a small
  `VendorNav.tsx` if that split is cleaner — your call, keep it to 1–2 files)
- `src/components/ui/StatusBadge.tsx` (shared badge component, Phase-2 dependency)

## Task breakdown

### Phase 1 — Shared vendor dashboard shell

**Goal:** every page under `/vendor/dashboard/*` renders inside one persistent shell
instead of each being an independent centered-card `<div>`.

1. Create `VendorDashboardShell.tsx` — a server or client component (your call based
   on what it needs) that renders:
   - A header bar reusing the brand tokens from `Header.tsx` (amber-400 accent,
     zinc-950/zinc-900/zinc-800 surface colors, the "MM" logo mark) — but with vendor
     dashboard's own content: vendor name, city, verification-status badge (reuse the
     exact `statusCopy` map already in `dashboard/page.tsx`), not the homepage's
     `onStartForm`/anchor-link nav.
   - A nav row/sidebar with: Dashboard · Opportunities · Booking Requests · Edit
     Profile · Log out (reuse `<LogoutButton />` as-is).
   - A `children` slot for the page content.
2. Accept `vendor: {name, city, verificationStatus}` as a prop (or fetch it itself —
   pick whichever avoids duplicating the `getVendorSession()` + `prisma.vendor.findUnique`
   call already in `dashboard/page.tsx`; a shared `layout.tsx` under
   `src/app/vendor/dashboard/` that does the session/vendor fetch once and passes data
   down is the idiomatic Next.js App Router answer — use that pattern if it fits
   cleanly, since Next.js layouts are designed exactly for this).
3. Wire it into `dashboard/page.tsx`, `opportunities/page.tsx`,
   `booking-requests/page.tsx`, and the quote builder's page — replacing each page's
   own `<div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">`
   wrapper, NOT the content inside it. The actual list/card/form JSX each page renders
   stays exactly as-is; only the outer wrapper changes.
4. Do NOT touch `booking-requests/[bookingRequestId]/page.tsx` or
   `opportunities/[opportunityId]/page.tsx` in this task unless you can confirm they
   follow the identical wrapper pattern — check first, then decide if they're in scope
   for the same shell swap. If their structure differs meaningfully, note it in your
   report rather than forcing them to fit.

**Acceptance criteria:** navigating between Dashboard / Opportunities / Booking
Requests / Edit Profile shows a persistent header+nav that does not disappear or
re-render from scratch each time (verify visually — click through all four in a real
browser). Verification-status badge still shows the correct PENDING/VERIFIED/REJECTED
state. Log out still works and redirects to `/vendor`.

### Phase 2 — List view filters and counts

**Scope correction from the casual plan:** empty states already exist — do NOT
rebuild them. This phase is only:

1. Add status filter tabs to `opportunities/page.tsx` (All / New / Viewed /
   Interested / Declined) and `booking-requests/page.tsx` (All / New Request / Under
   Review / Accepted / Rejected / Expired) — client-side filtering of the
   already-fetched array (these lists are small; do not add pagination or a new API
   call for this, that would be scope creep against what the current data volume
   needs).
2. Add a count next to each nav item in the new shell (e.g. "Opportunities · 3") —
   requires the shell (or its layout) to know the counts; a lightweight
   `prisma.vendorOpportunity.count(...)` / `prisma.bookingRequest.count(...)` alongside
   the existing vendor fetch is acceptable. Do not over-fetch full records just to
   count them.

**Acceptance criteria:** filter tabs actually filter the visible list (verify by
clicking each tab with real seeded data that has more than one status present — check
what statuses actually exist in the dev DB before claiming this works; if your dev data
only has one status, say so rather than claiming full coverage).

### Phase 3 — Quote builder formatting and structure

1. Fix the Total line (~line 277 as read this session, verify current line number
   fresh): change `Total: ₹{total}` to
   `Total: ₹{total.toLocaleString("en-IN")}` — matching the exact pattern already
   used in `booking-requests/page.tsx`. This is the single most concrete, lowest-risk
   fix in this whole brief.
2. Apply the same `.toLocaleString("en-IN")` formatting to each line item's displayed
   amount (`₹{item.amount}` around line 236) for consistency.
3. Restructure the line-items list into a proper table/grid layout (header row: Item |
   Amount | [remove]) instead of the current repeated flex-row divs — this is a visual
   restructure of existing data, not a logic change. The `addLineItem`/`removeLineItem`
   handlers and state (`lineItems`, `newLabel`, `newAmount`) are untouched.
4. Add inline validation messaging for the add-line-item inputs (e.g. a small red text
   line if `newAmount` is negative or `newLabel` is empty on submit attempt) rather than
   relying on the native browser tooltip — check first whether any validation exists
   today (this session did not verify that in depth; read the file fresh to confirm
   before assuming there's a gap).

**Acceptance criteria:** building a quote with 2+ line items shows correctly
comma-grouped ₹ amounts in both the per-item rows and the Total line, in a real
browser, with real seeded opportunity data (not just a build-passes check).

## Explicit out of scope for this brief

- Mobile/responsive verification (separate phase, not in this brief)
- Toast/loading-state feedback for Accept/Reject/Cancel actions (separate phase)
- Any change to `/admin/*` pages
- Any change to business logic in `domain/opportunity`, `domain/booking`,
  `domain/quote`, or any Prisma schema/migration
- Consolidating the three `STATUS_LABEL` maps into the new `StatusBadge` component is
  IN scope only if it falls out naturally while building the shell's status badge
  (Phase 1, item 1); do not go hunting through unrelated files to consolidate badges
  that aren't touched by Phases 1–3

## Stop conditions — ask rather than guess

- If `opportunities/[opportunityId]/page.tsx` or `booking-requests/[bookingRequestId]/page.tsx`
  turn out to need shell integration for Phase 1 to feel complete, but their structure
  doesn't cleanly fit the same wrapper swap — stop and describe the mismatch rather
  than forcing a fit.
- If seeded dev data doesn't have enough variety (e.g. only one opportunity status
  exists) to actually verify Phase 2's filter tabs — say so explicitly in your report,
  do not claim verified coverage you don't have.
- If any file's current content doesn't match what this brief describes (line numbers,
  variable names) — that means the file changed since this brief was written; re-read
  it fresh and adapt, and note the discrepancy in your report.

## Final report format

For each phase: what changed (file list), `npm run build` + `npm run test` result,
and the exact browser steps you'd take (or did take, if you have browser access) to
confirm it visually. Flag anything you found but did not fix as a separate "noticed,
not in scope" list.
