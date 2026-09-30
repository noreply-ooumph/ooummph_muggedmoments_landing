# MuggedMoments — Public-Facing Trust & UX Brief (Phases 1–6)

## Role and mandate

Act as a senior full-stack engineer (30+ yrs) implementing this brief against a live,
production-tracked Next.js 16 / Prisma / PostgreSQL codebase. Every fact below was
verified by reading the actual current files and querying the live dev database
immediately before this brief was written — not assumed. You must do the same:
**read each file fresh, immediately before editing it**. Do not trust this document's
line numbers if a file has changed since — re-read and re-locate.

This brief corrects two real inaccuracies in the casual plan that preceded it (see
"Corrections from the casual plan" below) — read that section before starting, it
changes what Phase 2 and Phase 5/6 are actually allowed to build.

## Non-negotiable guardrails

1. **Additive/refactor only, never destructive.** Everything under "Confirmed already
   working" must still work, byte-for-byte, after your changes.
2. **No invented facts, no invented UI claims.** This is the highest-risk brief so far
   for this failure mode — see the CTA-honesty correction below. Do not build any
   button, badge, or copy that implies a guarantee the system cannot back.
3. **No scope creep.** Build exactly what's listed. Flag anything else you notice.
4. **Verify, don't assume.** Run `npx tsc --noEmit` and `npm run test` after every
   task. Do NOT run `npm run build` while `npm run dev` is running elsewhere (this
   corrupted `.next` earlier this project — confirmed root cause, documented in an
   earlier brief).
5. **Live-verify visually**, with real seeded data. This session's most important
   finding (the vendor "baba dj," id `6d8fe8f7-825d-4816-8d7b-98bc85a17d7c`) has a
   genuinely empty profile — `about: null`, `startingPrice: null`, `serviceAreas: []`,
   0 portfolio items, `profileComplete: false` — confirmed by direct DB query. Use
   this vendor specifically to verify Phase 3's empty-state handling, and a
   fully-populated vendor (query for one with `profileComplete: true` and
   `portfolioItems` count > 0) to verify Phase 2's rich-content rendering.

## Corrections from the casual plan — read before starting

### Correction 1 — the CTA cannot say "enquire with this vendor"

The casual plan said Phase 2's CTA should let a customer "enquire with this vendor."
**This is not something the system can honestly offer.** Verified in
`domain/matching/matchingService.ts` and enforced everywhere else in this codebase: matching is
strictly deterministic and automatic across ALL eligible vendors — there is no
mechanism, anywhere in this app, for a customer to hand-pick a single vendor and
guarantee a connection with them specifically. Building a button that implies
otherwise would be exactly the kind of fabricated claim this codebase's own
`trustClaims.ts`, `matching-rules.ts`, and `publicVendorProfileService.ts` comments
repeatedly warn against ("no ranking," "no fabricated claim," "never imply what the
system can't back").

**What the CTA must actually do and say:** route into the existing `/plan-event` form
with the vendor's services and city pre-selected (a head start, not a guarantee), with
copy that is honest about that distinction — e.g. "Start planning — we'll match you
with vendors like this one based on your requirements," never "Enquire with
[vendor name]" or "Contact this vendor."

### Correction 2 — there is no profile-completion percentage, only a boolean

The casual plan's Phase 5 example ("your profile is 40% complete") is a fabricated
number — no such calculation exists anywhere in this codebase. What's real, verified
in `domain/vendorProfile/vendorProfileService.ts`:

```ts
export function deriveProfileComplete(vendor: VendorProfileLike): boolean {
  const hasAbout = vendor.about !== null && vendor.about.trim().length > 0;
  const hasStartingPrice = vendor.startingPrice !== null;
  const hasServiceAreas = vendor.serviceAreas.length > 0;
  return hasAbout && hasStartingPrice && hasServiceAreas;
}
```

This is a real boolean (`Vendor.profileComplete`) that **also gates matching
eligibility** — `matchingService.ts` excludes a vendor from matching entirely if
`!vendor.profileComplete`. This is not just a display nicety; it's load-bearing
business logic. Two consequences for this brief:
- Do NOT build a percentage bar. Build an honest checklist against the same 3 real
  fields (`about`, `startingPrice`, `serviceAreas`) this function already checks.
- Portfolio photos are NOT part of this gate — a vendor can be `profileComplete: true`
  with zero portfolio photos. Phase 5/6 messaging must keep these conceptually
  separate: "complete enough to be matched" (the 3-field boolean) vs. "has photos to
  look trustworthy to customers" (portfolio count, a separate, softer nudge).

## Confirmed already working — do not re-build

- Vendor dashboard shell (`VendorDashboardShell.tsx` + `layout.tsx`), `StatusBadge`,
  filter tabs, quote builder table/formatting, action loading/success states — all
  from the two prior briefs this session. None of this is touched by this brief.
- `toPublicVendorProfile()` mapper (`publicVendorProfileService.ts`) — correct,
  deliberately excludes `contactPhone`/`isDevelopmentSeed`/timestamps. Extend its
  return shape only if a new field is genuinely needed (e.g. nothing here requires
  that — reuse as-is).
- `ProgressiveForm.tsx` already supports `initialEventSlug` and `initialServices`
  props (apply-once-on-mount pattern, never overwrites a resumed session). It does
  **not** support a city pre-fill today — Phase 2 needs to add this narrowly (see
  below), not assume it exists.
- `EditProfileClient.tsx` already has a working portfolio upload (max 12 items,
  `MAX_PORTFOLIO_ITEMS` const) and about/price/service-area editing, wired to
  `PATCH /api/vendor/profile` which derives and persists `profileComplete` server-side
  via `deriveProfileComplete()`. Do not duplicate this logic — Phase 6 only needs to
  surface it more visibly in the dashboard, not recompute it.
- `Header.tsx` (homepage) — has real brand tokens (amber-400/zinc-950/900/800, "MM"
  logo mark) but takes an `onStartForm` prop tied to the homepage's own modal-launch
  logic and `#anchor` links specific to homepage sections. Do not import or reuse this
  component directly for the new public header (Phase 1) — build a separate,
  purpose-built component that borrows the same visual tokens, exactly the same
  relationship `VendorDashboardShell.tsx` already has to it.

## Files this touches (read each fresh before editing)

- `src/app/vendors/page.tsx` (directory)
- `src/app/vendors/[vendorId]/page.tsx` (public profile)
- `src/domain/vendorProfile/publicVendorProfileService.ts` (read-only reference)
- `src/components/form/ProgressiveForm.tsx` (adding one new optional prop)
- `src/app/vendor/dashboard/page.tsx` (dashboard home — Phase 5/6)
- `src/app/vendor/dashboard/layout.tsx` (read-only reference — already fetches
  vendor + counts; Phase 5 may need one more field from the same existing query)

New files expected:
- `src/components/public/PublicSiteHeader.tsx` (Phase 1)
- Possibly a small shared `VendorAvatarPlaceholder.tsx` or inline helper for the
  initials-gradient fallback (Phase 2/4) — your call whether it's worth its own file
  for 2 call sites; if not, inline it in both, don't force an abstraction for its own
  sake

## Task breakdown

### Phase 1 — Shared public header

Build `PublicSiteHeader.tsx`: logo mark (reuse the same amber gradient
"MM" square + wordmark styling `Header.tsx` and `VendorDashboardShell.tsx` both
already use — this is now a 3rd occurrence of the same visual pattern; if it's
trivial to extract a shared `LogoMark` component without touching the two existing
call sites' behavior, do so, but don't force it if it risks touching working code),
a link to `/vendors` ("Explore Vendors"), and a link to `/` with a "Plan My Event"
CTA (a plain `<Link href="/">` is fine — it does not need to open the homepage's
modal directly, that's homepage-specific interactive state this header shouldn't
reach into). No auth, no vendor-session awareness — this is the customer-facing side.

Wrap `/vendors` and `/vendors/[vendorId]` in it, replacing their current
`<div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">`
outer wrapper with the new header + a content area — same category of change as the
vendor-dashboard shell wiring from the prior brief.

**Acceptance criteria:** both pages show a persistent header with working links; no
change to the actual profile/directory content underneath.

### Phase 2 — Public vendor profile: hero, honest CTA, reorganized sections

1. **Hero section**: if `portfolioItems.length > 0`, use the first item's image as a
   cover. If zero (true for `profileComplete: false` vendors like "baba dj" — verify
   with this exact vendor), use an initials-based gradient placeholder — same visual
   language as the "MM" logo mark (a colored square/circle with the vendor's initials
   derived from `profile.name`), never a stock photo or a broken `<img>` tag. Show
   name, city, verification badge in this hero.
2. **The CTA — read Correction 1 above again before building this.** Add a button:
   "Start Planning" or equivalent (not "Enquire with [name]"), linking to
   `/plan-event?services=...&city=...` (query params) or via router state — your
   call on mechanism, but it must land on the real `ProgressiveForm` with those values
   applied via `initialServices` (already supported) and a **new** `initialCity` prop
   you add to `ProgressiveForm.tsx`, mirroring the exact existing pattern for
   `initialServices` (apply-once on mount, only if the city field is currently empty,
   never overwrite a resumed session — same guard, same shape).
3. **Reorganize existing sections** (about/portfolio/services/service
   areas/startingPrice) into clearer visual blocks (headers, icons, spacing) — this is
   a visual restructure of data already being fetched and mapped correctly; no change
   to `toPublicVendorProfile()` or the Prisma query should be needed.

**Acceptance criteria:** load the profile for a vendor with `profileComplete: true`
and portfolio photos (query the DB to find one, or use the vendor at
`dev-vendor-c-00000003` referenced in an earlier session's verification if it's still
seeded) — confirm hero image, all sections, and the CTA render correctly. Then load
`6d8fe8f7-825d-4816-8d7b-98bc85a17d7c` ("baba dj") and confirm the initials-placeholder
hero renders instead of a broken image.

### Phase 3 — Honest empty-section copy

For each section that's conditionally hidden today, add a short honest fallback
instead of rendering nothing — matching the exact tone/pattern already established in
`trustClaims.ts`'s empty-state copy from an earlier brief (say what's true, never
fake a specific claim):
- No portfolio photos → "This vendor hasn't added portfolio photos yet."
- No about text → omit the section entirely (a missing bio is less conspicuous than a
  missing photo grid; use your judgment, but do not invent filler bio text)
- No service areas → omit or "Ask about service coverage when you get in touch"

**Acceptance criteria:** verify against "baba dj" specifically — the page should read
as "a real, if new, vendor," not as a broken/incomplete page.

### Phase 4 — Vendor directory (`/vendors`) consistency

Add the Phase 1 header (done as part of Phase 1's wiring). Additionally:
- Each directory card: if a vendor has zero portfolio photos, show the same
  initials-placeholder treatment from Phase 2 instead of just omitting the image
  entirely (check current behavior first — `vendors/page.tsx` currently only renders
  `<img>` when `vendor.portfolioItems[0]` exists, with no fallback)
- Add `startingPrice` (if set) and a service count to each card for more signal
  before a customer clicks in

**Acceptance criteria:** the directory page with a mix of complete/incomplete
vendors (real seeded data has both) should show every vendor with a consistent card
treatment, no vendor rendering as a bare text-only card next to ones with photos.

### Phase 5 — Vendor dashboard home: real stat cards (no fabricated percentage)

In `dashboard/page.tsx` (or via `layout.tsx` if it's cleaner to fetch alongside the
existing vendor/count query — check what's already fetched there before adding a
second query), add to the dashboard home view:
- Open opportunities count / pending booking-requests count (the shell nav already
  shows these as `(N)` — decide whether repeating them in the page body too is useful
  or redundant; your call, state your reasoning in the report)
- A profile-completeness checklist reading the REAL 3 fields
  (`about`/`startingPrice`/`serviceAreas`) — e.g. "✓ About added, ✓ Starting price set,
  ✗ Service areas — add at least one" — not a percentage, not a fabricated number

**Acceptance criteria:** verify against both a `profileComplete: true` vendor (all 3
checks green, matches the real DB state) and "baba dj" (`profileComplete: false` —
confirm the checklist correctly shows all 3 as missing, matching the DB row you can
verify with a direct query).

### Phase 6 — Portfolio nudge (separate from the completeness gate)

Add a distinct, softer prompt when `portfolioItems.length === 0`: "Add a portfolio
photo to help customers trust your profile" with a link to `/vendor/dashboard/edit`.
Per Correction 2, keep this visually and conceptually separate from the Phase 5
completeness checklist — portfolio is not part of `deriveProfileComplete()` and must
not be presented as if it blocks matching eligibility, since it doesn't.

**Acceptance criteria:** verify this prompt shows for "baba dj" (0 portfolio items)
and does not show for a vendor with photos already uploaded.

## Explicit out of scope for this brief

- Any change to `matchingService.ts`, `deriveProfileComplete()`, or any matching
  eligibility logic — Phases 5/6 only *display* these existing facts
- Any change to `/admin/*`
- A literal single-vendor "enquire" mechanism — explicitly not being built, see
  Correction 1
- Reviews/testimonials — no real data exists for this yet (same blocker as the trust
  section work from an earlier session); do not fabricate placeholder reviews

## Stop conditions — ask rather than guess

- If you're about to write ANY copy that could be read as "you will be connected with
  this specific vendor" — stop, that's Correction 1's exact failure mode
- If you're about to compute or display a percentage anywhere related to profile
  completeness — stop, that's Correction 2's exact failure mode
- If extracting a shared `LogoMark` component risks any visual/behavior change to the
  homepage `Header.tsx` or `VendorDashboardShell.tsx` — don't force it, duplicate the
  small amount of markup instead and note it in your report

## Final report format

Same as prior briefs: per phase, files changed, `tsc --noEmit` + `npm run test`
result, and the exact real-vendor browser verification you performed — naming which
vendor id you used and what you saw, for both a complete and an incomplete profile.
