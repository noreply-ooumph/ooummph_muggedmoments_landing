# MuggedMoments — Master QA & System Testing Playbook
> **Document Grade:** Principal / Staff QA & Systems Engineering Manual (30+ Year Veteran Standard)  
> **Target Audience:** SDETs, Manual QA Engineers, Penetration Testers, Product Engineers, Release Managers  
> **Codebase Target:** Next.js 16 (App Router) / React 19 / TypeScript 5 / Prisma 6 / PostgreSQL / Tailwind CSS v4  
> **Status:** Production-Tracked Living Specification  

---

## Table of Contents
1. [Executive Summary & Core Philosophy](#1-executive-summary--core-philosophy)
2. [End-to-End System Topology & Tech Stack](#2-end-to-end-system-topology--tech-stack)
3. [Actor Personas & Journey Maps](#3-actor-personas--journey-maps)
4. [Domain Invariants & Critical Business State Machines](#4-domain-invariants--critical-business-state-machines)
   - [4.1 Lead Intake, Qualification & Completeness Engine](#41-lead-intake-qualification--completeness-engine)
   - [4.2 Deterministic Vendor Matching Engine](#42-deterministic-vendor-matching-engine)
   - [4.3 Vendor Opportunity Lifecycle & Expiration Logic](#43-vendor-opportunity-lifecycle--expiration-logic)
   - [4.4 Versioned Quotes, Line Items & Revisions](#44-versioned-quotes-line-items--revisions)
   - [4.5 Booking Request, Acceptance & Double-Booking Guard](#45-booking-request-acceptance--double-booking-guard)
   - [4.6 Booking Cancellation & Recovery Flow](#46-booking-cancellation--recovery-flow)
   - [4.7 Anti-Disintermediation Messaging Filter](#47-anti-disintermediation-messaging-filter)
   - [4.8 Phone Normalization & Passwordless Auth Model](#48-phone-normalization--passwordless-auth-model)
   - [4.9 Trust Claim Governance & Public Copy Rules](#49-trust-claim-governance--public-copy-rules)
5. [Complete Application Route & API Surface Inventory](#5-complete-application-route--api-surface-inventory)
6. [Data Model, Schema Constraints & Foreign Keys](#6-data-model-schema-constraints--foreign-keys)
7. [Environment Setup, Test Data Seeding & Personas](#7-environment-setup-test-data-seeding--personas)
8. [Automated Test Harness Execution Guide](#8-automated-test-harness-execution-guide)
9. [Exhaustive Manual & Exploratory QA Test Suites](#9-exhaustive-manual--exploratory-qa-test-suites)
   - [Suite 01: Multi-Step Lead Intake & Progressive Form Funnel](#suite-01-multi-step-lead-intake--progressive-form-funnel)
   - [Suite 02: Deterministic Matching & Compatibility Assertions](#suite-02-deterministic-matching--compatibility-assertions)
   - [Suite 03: Customer Status Tracking & Phone Number Lookup](#suite-03-customer-status-tracking--phone-number-lookup)
   - [Suite 04: Vendor Onboarding, Phone Auth & Profile Completeness](#suite-04-vendor-onboarding-phone-auth--profile-completeness)
   - [Suite 05: Vendor Opportunity Inbox, Expiry & Response](#suite-05-vendor-opportunity-inbox-expiry--response)
   - [Suite 06: Quote Builder, Line Item Currency & Version Revision](#suite-06-quote-builder-line-item-currency--version-revision)
   - [Suite 07: Bidirectional Messaging & Disintermediation Interception](#suite-07-bidirectional-messaging--disintermediation-interception)
   - [Suite 08: Booking Request Review, Acceptance & Idempotency](#suite-08-booking-request-review-acceptance--idempotency)
   - [Suite 09: Double-Booking Prevention & Date Collision Testing](#suite-09-double-booking-prevention--date-collision-testing)
   - [Suite 10: Booking Cancellation & Recovery Banner](#suite-10-booking-cancellation--recovery-banner)
   - [Suite 11: Vendor Consultation Meetings Scheduling](#suite-11-vendor-consultation-meetings-scheduling)
   - [Suite 12: Admin Moderation, Vendor Vetting & Audit Trails](#suite-12-admin-moderation-vendor-vetting--audit-trails)
   - [Suite 13: Security, IDOR, Session Hijacking & Injection Gates](#suite-13-security-idor-session-hijacking--injection-gates)
   - [Suite 14: Mobile Responsiveness, Viewports & Breakpoints](#suite-14-mobile-responsiveness-viewports--breakpoints)
10. [Critical Edge Cases, Boundary Conditions & Chaos Scenarios](#10-critical-edge-cases-boundary-conditions--chaos-scenarios)
11. [Troubleshooting, Observability & Debugging Runbook](#11-troubleshooting-observability--debugging-runbook)
12. [Defect Severity Matrix, Triage & Production Sign-Off Checklist](#12-defect-severity-matrix-triage--production-sign-off-checklist)

---

## 1. Executive Summary & Core Philosophy

**MuggedMoments** is a high-trust, transaction-grade event planning and vendor marketplace engineered specifically for the Indian event industry (weddings, corporate celebrations, birthdays, milestone gatherings). It pairs event hosts with verified vendors (photographers, caterers, venues, decorators, DJs, makeup artists) across Indian cities.

Unlike generic aggregator platforms, MuggedMoments operates under strict, battle-tested architectural principles:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE ARCHITECTURAL AXIOMS                       │
├────────────────────────────────────────────────────────────────────────┤
│ 1. 100% DETERMINISTIC MATCHING                                         │
│    Zero LLM hallucinations. Zero subjective "Top/Best" ranking. Every  │
│    match is binary, explainable, and derived purely from hard data.    │
├────────────────────────────────────────────────────────────────────────┤
│ 2. IMMUTABLE HISTORICAL SNAPSHOTS                                      │
│    Quotes are strictly versioned. Accepted bookings lock an immutable  │
│    quote snapshot. Mutating an active quote is physically impossible.  │
├────────────────────────────────────────────────────────────────────────┤
│ 3. DATABASE-ENFORCED INVARIANTS                                        │
│    Double-booking prevention is enforced at the database schema level  │
│    (@@unique([vendorId, date])), not by leaky application-level checks.│
├────────────────────────────────────────────────────────────────────────┤
│ 4. HONEST, UNFABRICATED USER INTERFACES                                │
│    No fake completion percentages, no false availability badges, no    │
│    fabricated trust testimonials. If data does not exist, the UI says  │
│    so plainly.                                                         │
├────────────────────────────────────────────────────────────────────────┤
│ 5. PLATFORM INTEGRITY (DISINTERMEDIATION DEFENSE)                      │
│    Real-time regex filters prevent unauthorized bypass of the platform │
│    by blocking phone numbers and emails in pre-booking chats.          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. End-to-End System Topology & Tech Stack

```
                              ┌─────────────────────────────────────────┐
                              │            Next.js 16 App               │
                              │          (React 19, Turbopack)          │
                              └────────────────────┬────────────────────┘
                                                   │
                ┌──────────────────────────────────┼──────────────────────────────────┐
                ▼                                  ▼                                  ▼
   ┌─────────────────────────┐        ┌─────────────────────────┐        ┌─────────────────────────┐
   │      Public & Host      │        │      Vendor Portal      │        │      Admin Portal       │
   │       Experiences       │        │       Experiences       │        │       Experiences       │
   │  • / (Landing)          │        │  • /vendor (Login/Reg)  │        │  • /admin/leads         │
   │  • /plan-event (Funnel) │        │  • /vendor/dashboard    │        │  • /admin/vendors       │
   │  • /status/[publicId]   │        │  • /vendor/.../quotes   │        │  • /admin/reports       │
   │  • /my-requests         │        │  • /vendor/.../booking  │        │                         │
   └────────────┬────────────┘        └────────────┬────────────┘        └────────────┬────────────┘
                │                                  │                                  │
                └──────────────────────────────────┼──────────────────────────────────┘
                                                   │
                                     ┌─────────────▼─────────────┐
                                     │   API & Validation Layer  │
                                     │  • App Router Route Hndlrs│
                                     │  • Zod Contract Schemas   │
                                     │  • Idempotency Gatekeeper │
                                     │  • Anti-Disintermediation │
                                     └─────────────┬─────────────┘
                                                   │
                                     ┌─────────────▼─────────────┐
                                     │    Domain Service Layer   │
                                     │  • Matching Engine        │
                                     │  • Completeness Engine    │
                                     │  • Scoring Service        │
                                     │  • Opportunity Engine     │
                                     │  • Booking State Machine  │
                                     └─────────────┬─────────────┘
                                                   │
                                     ┌─────────────▼─────────────┐
                                     │   Prisma 6 Client & ORM   │
                                     └─────────────┬─────────────┘
                                                   │
                                     ┌─────────────▼─────────────┐
                                     │   PostgreSQL (Neon DB)    │
                                     │  • directUrl (Migrations) │
                                     │  • url (Runtime Pooling)  │
                                     └───────────────────────────┘
```

### Technology Matrix
| Layer | Technology | Version | Key Architectural Responsibility |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `16.3.6` | Server Components, Route Handlers, Streaming SSR |
| **UI Runtime** | React | `19.2.8` | Client State, Progressive Forms, Dynamic Transitions |
| **Styling** | Tailwind CSS / PostCSS | `^4.0.0` | Dark-mode design system, zinc/amber palette |
| **Database ORM** | Prisma | `^6.4.0` | Type-safe query builder, migration deployments |
| **Database Engine** | PostgreSQL (Neon) | `16.x` | Relational integrity, advisory locks, UUIDs |
| **Data Validation** | Zod | `^4.6.5` | Authoritative client & server request schema validation |
| **File Storage** | Public Static / Vercel Blob | `@vercel/blob ^2.8` | Portfolio pictures, brochures, PDF sanitization |
| **Unit Test Suite** | Vitest + JSDOM | `^2.1.9` | In-memory unit test runner (23 suites, 200+ specs) |
| **E2E Test Suite** | Playwright | `^1.63.0` | Real browser automated end-to-end user journeys |

---

## 3. Actor Personas & Journey Maps

```mermaid
journey
    title The MuggedMoments End-to-End Lifecycle
    section Customer (Event Host)
      Visits Landing & Explores Services: 5: Customer
      Completes Progressive Form (/plan-event): 4: Customer
      Receives Tracking Code (MM-XXXXXXXX): 5: Customer
      Views Matched Vendors & Explains: 4: Customer
      Receives & Compares Quotes: 5: Customer
      Engages in Q&A Chat: 4: Customer
      Submits Booking Request: 5: Customer
      Receives Confirmed Booking (BK-XXXXXXXX): 5: Customer
    section Vendor (Service Provider)
      Registers / Logs in with Phone: 5: Vendor
      Completes Profile (Bio, Price, Areas): 4: Vendor
      Receives 48h Opportunity: 5: Vendor
      Reviews Lead & Expresses Interest: 5: Vendor
      Builds Line-Item Versioned Quote: 4: Vendor
      Answers Customer Questions: 4: Vendor
      Receives Booking Request: 5: Vendor
      Accepts Booking (Locks Calendar): 5: Vendor
    section Platform Admin
      Inspects Lead Pipeline: 4: Admin
      Vets & Verifies New Vendors: 5: Admin
      Audits Immutable Logs: 5: Admin
```

---

## 4. Domain Invariants & Critical Business State Machines

### 4.1 Lead Intake, Qualification & Completeness Engine

When a customer submits an event request, it does not simply drop into a table; it transitions through a formal state machine:

```mermaid
stateDiagram-v2
    [*] --> CAPTURED: Form Submission
    CAPTURED --> INCOMPLETE: Missing Required Fields
    CAPTURED --> COMPLETE: All Fields Present
    INCOMPLETE --> QUALIFICATION_PENDING: Customer Resumes Form
    QUALIFICATION_PENDING --> INCOMPLETE: Still Missing Fields
    QUALIFICATION_PENDING --> COMPLETE: All Fields Supplied
    COMPLETE --> QUALIFIED: Immediate Auto-Promotion
    QUALIFIED --> ROUTED: Eligible Matches > 0
    QUALIFIED --> QUALIFIED: Eligible Matches = 0
```

- **Completeness Dimensions:** Verified deterministically via `src/domain/completeness/completenessService.ts`. Evaluates: `eventTypeId`, `city`, `eventDate`, `services[]`, `customerName`, `phone`.
- **"Other" Event Types:** When a customer selects `other`, the field `customEventTypeName` is strictly **mandatory**. The matching engine skips event-type matching for `other` leads because vendors cannot pre-declare unbounded categories.
- **Idempotency Guarantee:** The submission endpoint requires an `idempotencyKey` (UUIDv4). If a customer clicks "Submit" three times in rapid succession, the backend catches the unique constraint and returns the identical lead representation without duplicating database rows.

---

### 4.2 Deterministic Vendor Matching Engine

Matching (`src/domain/matching/matchingService.ts`) is strictly mathematical and explainable:

$$\text{Eligible} = \text{Active} \land \text{ProfileComplete} \land (\text{CityMatch}) \land (\text{EventTypeMatch} \lor \text{EventType is 'other'}) \land (\text{ServiceOverlap} > 0)$$

```
Match Rule Hierarchy:
1. Vendor.active must be TRUE.
2. Vendor.profileComplete must be TRUE.
3. City MUST match exactly (case-insensitive trim). City mismatch causes immediate disqualification.
4. Event Type: Vendor must support the event type under VendorService.eventTypes (skipped if slug is "other").
5. Service: Vendor must provide AT LEAST ONE of the requested services (VendorService.serviceId).
6. Reasons Array: ["CITY_MATCH", "SERVICE_MATCH", "EVENT_TYPE_MATCH"].
   CRITICAL NOTE: Internal reason codes NEVER reach the client. The UI shows an honest general sentence.
```

---

### 4.3 Vendor Opportunity Lifecycle & Expiration Logic

When a lead matches an eligible vendor, a `VendorOpportunity` record is created.

```mermaid
stateDiagram-v2
    [*] --> CREATED
    CREATED --> SENT: Dispatched to Vendor
    SENT --> VIEWED: Vendor Opens Opportunity
    VIEWED --> INTERESTED: Vendor Clicks "I'm Interested"
    VIEWED --> DECLINED: Vendor Clicks "Can't Take This"
    INTERESTED --> QUOTE_PENDING: Vendor Starts Quote
    QUOTE_PENDING --> QUOTE_SUBMITTED: Vendor Submits Quote

    SENT --> EXPIRED: 48 Hours Passed (Read-time derived)
    VIEWED --> EXPIRED: 48 Hours Passed (Read-time derived)
```

> [!IMPORTANT]  
> **Read-Time Expiry Invariant:** There is **NO cron job** mutating expired opportunities to `EXPIRED`. Expiry is a dynamic read-time fact:  
> `isExpired() = (status === "SENT" || status === "VIEWED") && (now > responseDeadline)`.  
> Once a vendor clicks *Interested* or *Declined*, the record is immune to expiration because an explicit operational decision was recorded.

---

### 4.4 Versioned Quotes, Line Items & Revisions

```mermaid
erDiagram
    VendorOpportunity ||--o| Quote : owns
    Quote ||--|{ QuoteVersion : contains
    QuoteVersion ||--|{ QuoteLineItem : has
    QuoteVersion ||--o{ BookingRequest : referenced_by

    QuoteVersion {
        string id PK
        int versionNumber
        enum status "DRAFT | SUBMITTED"
        enum availabilityState "AVAILABLE | PENDING_CONFIRMATION | UNAVAILABLE"
        datetime validUntil
        text notes
    }

    QuoteLineItem {
        string id PK
        string label
        int amount "Whole INR Rupees"
        int order
    }
```

- **Version Numbering:** Sequential integers ($1, 2, 3 \dots$). The active quote is always the highest version with `status: "SUBMITTED"`.
- **Revision Safeguard:** When a vendor clicks "Revise Quote", version $N$ remains intact and read-only. A new draft $N+1$ is cloned. If the customer already initiated a booking request on version $N$, version $N$ cannot be deleted or mutated.
- **Financial Calculations:** All monetary values are integer whole rupees (`amount: Int` in Prisma). Display uses standard Indian numbering format (e.g., `₹2,50,000` via `.toLocaleString("en-IN")`).

---

### 4.5 Booking Request, Acceptance & Double-Booking Guard

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Frontend as /status/[publicLeadId]
    participant API as /api/leads/.../booking-request
    participant DB as Postgres (Prisma)
    actor Vendor
    participant VendorAPI as /api/vendor/booking-requests/.../accept

    Customer->>Frontend: Clicks "Request Booking"
    Frontend->>Frontend: Opens Verification Modal (Dates, Line Items)
    Customer->>API: POST { idempotencyKey, quoteVersionId }
    API->>DB: Create BookingRequest (status: REQUESTED, 48h deadline)
    API-->>Customer: 201 Created (Waiting for Vendor)

    Vendor->>VendorAPI: POST /accept
    VendorAPI->>DB: Check VendorAvailability for Event Date
    alt Already Booked
        DB-->>VendorAPI: Conflict (Unique Constraint Violation)
        VendorAPI-->>Vendor: 409 Conflict: "Date already booked"
    else Available
        DB->>DB: Begin Transaction
        DB->>DB: Update BookingRequest -> ACCEPTED
        DB->>DB: Upsert VendorAvailability -> UNAVAILABLE
        DB->>DB: Create Booking (publicBookingId: BK-XXXXXXXX)
        DB->>DB: Create BookingStatusHistory (CONFIRMED)
        DB->>DB: Commit Transaction
        VendorAPI-->>Vendor: 201 Created
    end
    Customer->>Frontend: Reloads / Polling
    Frontend-->>Customer: Displays Confirmed Booking Card (BK-XXXXXXXX)
```

> [!CAUTION]  
> **Atomic Double-Booking Guard:**  
> The table `vendor_availability` maintains a unique composite constraint:  
> `@@unique([vendorId, date])`.  
> Both the date normalization (enforced to `00:00:00.000Z` UTC) and the database constraint guarantee that even if two booking requests are accepted concurrently by race condition, only one database commit will succeed; the second will fail with a foreign key / unique collision.

---

### 4.6 Booking Cancellation & Recovery Flow

- **Dual-Party Cancellation:** A confirmed booking can be cancelled by either the **Customer** or the **Vendor**.
- **State Transition:** `Booking.status` transitions from `CONFIRMED` to `CANCELLED`. The actor who cancelled is immutably recorded in `Booking.cancelledBy` (`CUSTOMER` or `VENDOR`).
- **Calendar Release:** The vendor's calendar record in `VendorAvailability` for that date is reset or deleted, unlocking the date for future opportunities.
- **Recovery UX:** When a booking is cancelled or rejected, the customer's status page displays the `BookingRecoveryBanner`. It encourages the host not to abandon the event and lists alternative matched vendors who offer identical services in their city.

---

### 4.7 Anti-Disintermediation Messaging Filter

To prevent platform bypass prior to booking confirmation, every message in the Q&A thread (`QuoteMessage`) is evaluated before persistence:

```typescript
// Enforced in src/domain/messaging/contactInfoFilter.ts
export function detectContactInfo(text: string): "PHONE_NUMBER" | "EMAIL_ADDRESS" | null
```

- **Phone Detection Patterns:**
  - 10-digit raw numbers (e.g., `9876543210`)
  - Numbers with Country Code (`+91 98765 43210`, `919876543210`)
  - Delimited numbers (`987-654-3210`, `98765 43210`, `98765.43210`)
- **Email Detection Patterns:**
  - Standard RFC 5322 regex catching email strings within prose.
- **Permitted Prose:**
  - Currency amounts (`₹1,50,000`, `500000 rupees`).
  - Guest counts (`expecting 2000 guests`).
  - Calendar dates (`15 June 2028`).

---

### 4.8 Phone Normalization & Passwordless Auth Model

Both vendor authentication and customer status lookup utilize a **phone-first, passwordless architecture**.
- **Operational Choice:** Per deliberate operator sign-off, there is **no SMS OTP verification code**. Login and lookup are phone-only.
- **Format Resilience (`normalizePhoneLast10`):**
  A user typing `+91 98765 43210` on mobile and `9876543210` on desktop must access the exact same records.
  The engine:
  1. Executes a high-speed direct query (`where: { phone }` or `{ contactPhone }`).
  2. If not matched, strips all non-digit characters (`replace(/\D/g, "")`) and slices the **last 10 digits**.
  3. Scans candidates in application code to guarantee zero orphaned records.

---

### 4.9 Trust Claim Governance & Public Copy Rules

Enforced via `src/config/trustClaims.ts`:
- Every factual marketing claim must exist in the `TRUST_CLAIMS` registry.
- Only claims with `status: "APPROVED"` may be rendered in customer UI.
- Claims with `DRAFT`, `PENDING_VERIFICATION`, `REJECTED`, or `EXPIRED` are filtered out.
- When zero claims are approved, the UI renders the mandatory honest fallback:  
  *"New on MuggedMoments. We're onboarding our first verified venues and vendors. Every listing is checked before it goes live."*

---

## 5. Complete Application Route & API Surface Inventory

### 5.1 Web Application Page Routes
| Route | Access Tier | Rendering Model | Purpose |
|---|---|---|---|
| `/` | Public | Static / SSR | Homepage, trust banner, category exploration, CTA |
| `/plan-event` | Public | Client Interactive | 6-step progressive event planning funnel |
| `/my-requests` | Public | Client Interactive | Phone-number-based event request lookup |
| `/status/[publicLeadId]` | Public (Unlisted) | Dynamic SSR + Client | Comprehensive host dashboard: quotes, chat, bookings |
| `/thank-you` | Public | SSR | Post-submission confirmation with reference code |
| `/vendors` | Public | SSR + Client | Verified vendor directory with service filters |
| `/vendors/[vendorId]` | Public | SSR + Client | Public vendor profile: hero, bio, pricing, portfolio |
| `/find-[category]` | Public | Static SEO | Programmatic category landings (e.g. `/find-photographer`) |
| `/vendor` | Public / Vendor | Client Interactive | Vendor portal entry: phone login & registration |
| `/vendor/dashboard` | Vendor Protected | Server Layout + Client | Vendor overview, verification status, active counts |
| `/vendor/dashboard/opportunities` | Vendor Protected | Client Filterable | Inbox for leads with filter tabs (All, Viewed, Interested) |
| `/vendor/dashboard/opportunities/[id]`| Vendor Protected | SSR + Client | Opportunity details, customer requirements, actions |
| `/vendor/dashboard/opportunities/[id]/quote`| Vendor Protected| Client Interactive | Line-item quote builder, price calculator, revisioning |
| `/vendor/dashboard/booking-requests` | Vendor Protected | Client Filterable | List of received booking requests with status filters |
| `/vendor/dashboard/booking-requests/[id]`| Vendor Protected | SSR + Client | Review booking, accept, or reject with reason codes |
| `/vendor/dashboard/edit` | Vendor Protected | Client Interactive | Profile bio, starting price, service areas, portfolio uploads |
| `/vendor/dashboard/availability` | Vendor Protected | Client Interactive | Calendar management: mark dates Available / Blocked |
| `/vendor/dashboard/meetings` | Vendor Protected | SSR + Client | Scheduled customer consultations & meeting management |
| `/admin/leads` | Admin | Server / Client | Lead pipeline overview, manual status override |
| `/admin/vendors` | Admin | Server / Client | Vendor moderation queue: approve / reject credentials |
| `/admin/reports` | Admin | Server | Platform metrics, funnel conversion analytics |

---

### 5.2 Authoritative API Route Registry
| HTTP Method | Route Endpoint | Payload Schema | Auth / Session | Success / Error Codes |
|---|---|---|---|---|
| `POST` | `/api/leads` | `CreateLeadSchema` | Public (`idempotencyKey`) | `201 Created`, `409 Duplicate`, `422 Validation` |
| `POST` | `/api/leads/by-phone` | `{ phone: string }` | Public (Rate Limited) | `200 OK` (`leads: []`), `422 Bad Phone` |
| `GET` | `/api/leads/[publicLeadId]` | None (URL Param) | Public (`MM-XXXXXXXX`) | `200 OK`, `400 Malformed`, `404 Not Found` |
| `PATCH` | `/api/leads/[publicLeadId]` | `ResumeLeadSchema` | Public (`MM-XXXXXXXX`) | `200 OK`, `404 Not Found`, `422 Validation` |
| `POST` | `/api/leads/[publicLeadId]/quotes/[vendorId]/messages` | `{ senderType, body }` | Public (`MM-XXXXXXXX`) | `201 Created`, `422 Contact Info Blocked` |
| `POST` | `/api/leads/[publicLeadId]/quotes/[vendorId]/booking-request` | `{ idempotencyKey, quoteVersionId }` | Public (`MM-XXXXXXXX`) | `201 Created`, `409 Conflict`, `422 Stale Quote` |
| `POST` | `/api/leads/[publicLeadId]/quotes/[vendorId]/booking/cancel` | `{ reason, note }` | Public (`MM-XXXXXXXX`) | `200 OK`, `404 Not Found`, `409 Already Cancelled` |
| `POST` | `/api/vendor/login` | `VendorLoginSchema` | Public | `200 OK` (`isNewVendor: bool`), `422 Validation` |
| `POST` | `/api/vendor/register` | `VendorRegisterSchema` | Public | `201 Created` (Sets Cookie), `409 Conflict` |
| `POST` | `/api/vendor/logout` | None | Cookie (`mm_vendor_session`) | `200 OK` (Clears Cookie) |
| `PATCH` | `/api/vendor/profile` | `VendorProfileSchema` | Cookie (`mm_vendor_session`) | `200 OK` (Recalculates profileComplete) |
| `POST` | `/api/vendor/portfolio` | Multipart / FormData | Cookie (`mm_vendor_session`) | `201 Created`, `400 Max 12 Photos Exceeded` |
| `DELETE`| `/api/vendor/portfolio/[id]` | None (URL Param) | Cookie (`mm_vendor_session`) | `200 OK`, `403 Forbidden`, `404 Not Found` |
| `POST` | `/api/vendor/documents` | Multipart (PDF max 10MB)| Cookie (`mm_vendor_session`) | `201 Created`, `415 Invalid File Type` |
| `POST` | `/api/vendor/opportunities/[id]/respond` | `OpportunityActionSchema`| Cookie (`mm_vendor_session`) | `200 OK`, `409 Stale/Expired`, `422 Bad Action` |
| `POST` | `/api/vendor/opportunities/[id]/quote` | `CreateQuoteSchema` | Cookie (`mm_vendor_session`) | `201 Created`, `409 Already Exists` |
| `POST` | `/api/vendor/opportunities/[id]/quote/revise`| `ReviseQuoteSchema` | Cookie (`mm_vendor_session`) | `201 Created`, `422 Validation` |
| `POST` | `/api/vendor/booking-requests/[id]/accept` | None / `{ note }` | Cookie (`mm_vendor_session`) | `201 Created`, `409 Double-Booking Conflict` |
| `POST` | `/api/vendor/booking-requests/[id]/reject` | `RejectBookingRequestSchema`| Cookie (`mm_vendor_session`) | `200 OK`, `409 Already Decided` |
| `POST` | `/api/vendor/booking-requests/[id]/cancel` | `CancelBookingSchema` | Cookie (`mm_vendor_session`) | `200 OK`, `404 Not Found` |

---

## 6. Data Model, Schema Constraints & Foreign Keys

```
               ┌────────────────┐
               │   EventType    │
               └───┬────────────┘
                   │ 1
                   │
                   │ N
               ┌───▼────────────┐           1:1          ┌───────────────────┐
               │      Lead      ├───────────────────────►│ LeadQualification│
               └───┬────────┬───┘                        └───────────────────┘
                   │ 1      │ 1
                   │        │
                   │ N      │ 1:1                        ┌───────────────────┐
                   │        └───────────────────────────►│  LeadAttribution  │
                   │                                     └───────────────────┘
       ┌───────────┴────────────────────────┐
       │ N                                  │ N
┌──────▼──────────────┐             ┌───────▼─────────────┐
│   LeadVendorMatch   │             │  VendorOpportunity  │
└──────┬──────────────┘             └───────┬─────────────┘
       │ N                                  │ 1
       │                                    │
       │ 1                                  │ 1
┌──────▼──────────────┐             ┌───────▼─────────────┐
│       Vendor        │             │        Quote        │
└──────┬──────────────┘             └───────┬─────────────┘
       │ 1                                  │ 1
       │                                    │
       ├─────────────────┬────────────────┐ │ N
       │ N               │ N              │ ┌───────▼─────────────┐
┌──────▼──────────────┐  │                │ │    QuoteVersion     │
│   VendorService     │  │                │ └───────┬─────────────┘
└─────────────────────┘  │                │         │ 1
                         │                │         │
┌─────────────────────┐  │                │         │ N
│ VendorAvailability  │◄─┘                │ ┌───────▼─────────────┐
└─────────────────────┘                   │ │   BookingRequest    │
                                          │ └───────┬─────────────┘
┌─────────────────────┐                   │         │ 1
│VendorPortfolioItem  │◄──────────────────┘         │
└─────────────────────┘                             │ 1:1
                                            ┌───────▼─────────────┐
                                            │       Booking       │
                                            └─────────────────────┘
```

### Key Relational Constraints to Verify in Testing
1. `leads.public_lead_id`: Unique index. Format: `MM-` followed by 8 alphanumeric characters (`MM-[A-Z0-9]{8}`).
2. `bookings.public_booking_id`: Unique index. Format: `BK-` followed by 8 alphanumeric characters (`BK-[A-Z0-9]{8}`). Ensures zero confusion when both appear on the same screen.
3. `vendor_availability`: Composite unique constraint `@@unique([vendorId, date])`. Guarantees mathematical impossibility of duplicate bookings on identical dates.
4. `lead_vendor_matches`: Composite unique constraint `@@unique([leadId, vendorId])`.
5. `vendor_opportunities`: Composite unique constraint `@@unique([leadId, vendorId])`.
6. `quote_versions`: Composite unique constraint `@@unique([quoteId, versionNumber])`.

---

## 7. Environment Setup, Test Data Seeding & Personas

### 7.1 Environment Configuration (`.env`)
Ensure your environment contains the following keys (configured for PostgreSQL):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/muggedmoments?schema=public"
DATABASE_URL_UNPOOLED="postgresql://user:password@localhost:5432/muggedmoments?schema=public"
PORT=3000
NODE_ENV="development"
```

### 7.2 Database Initialization & Seeding Commands
```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Apply all database migrations
npx prisma migrate deploy

# 3. Seed deterministic development catalog & test vendors
npx prisma db seed
```

### 7.3 Canonical Seed Test Personas
| Persona Name | Identifier / ID | Location | Capabilities / Services | Test Role & Behavioral Invariants |
|---|---|---|---|---|
| **Vendor Development A** | `dev-vendor-a-00000001` | Mumbai | Photography, Catering (Weddings) | **Happy Path Matcher:** `profileComplete: true`, `active: true`. Has availability record. Used for instant MATCH + AVAILABLE testing. |
| **Vendor Development B** | `dev-vendor-b-00000002` | Delhi | Photography (Weddings) | **City Mismatch Negative Gate:** `city: Delhi`. Disqualifies immediately for any Mumbai or Lucknow requests. |
| **Vendor Development C** | `dev-vendor-c-00000003` | Mumbai | Decoration (Weddings) | **Profile Incomplete Gate:** `profileComplete: false`. Disqualifies from matching even though city matches. Used for E2E booking tests. |
| **Baba DJ** | `6d8fe8f7-825d-4816-8d7b-98bc85a17d7c`| Lucknow | DJ / Music | **Empty Profile Edge Case:** Bio: `null`, Starting Price: `null`, Service Areas: `[]`, Portfolio: 0 items. Tests honest fallback UI. |
| **Active Multi-Record Vendor** | Phone: `+919876500001` ID: `526bbdd9-8307-426a-a81d-a922647859a2` | Varied | Varied | **Rich Data Persona:** 11+ opportunities, 7+ booking requests. Use to verify filter tabs, counts, and scrolling. |

---

## 8. Automated Test Harness Execution Guide

> [!WARNING]  
> **Concurrency Rule (Cache Protection):**  
> **NEVER run `npm run build` while `npm run dev` is active in another shell.** Both processes share the `.next` directory and concurrent writes will corrupt the Turbopack build cache.  
> Use `npx tsc --noEmit` and `npm run test` for live code validation.

```bash
# 1. Run Complete Unit Test Suite (23 test suites, 200+ unit tests)
npm run test

# 2. Run Single Unit Test File in Isolation
npx vitest run tests/unit/matching.test.ts
npx vitest run tests/unit/contactInfoFilter.test.ts

# 3. Run Integration Test Suite (Launches child-process dev server & exercises real DB)
npm run test:integration

# 4. Run End-to-End Playwright Suite (Browser-driven full booking journey)
npm run test:e2e

# 5. Strict TypeScript Type-Checking
npx tsc --noEmit

# 6. Next.js ESLint Verification
npm run lint
```

---

## 9. Exhaustive Manual & Exploratory QA Test Suites

---

### Suite 01: Multi-Step Lead Intake & Progressive Form Funnel
**Objective:** Verify that an event host can configure requirements through the multi-step form, and that dynamic questions display conditionally based on event type.

- **Pre-conditions:** Dev server running at `http://localhost:3000`. Database seeded.
- **Test Steps:**
  1. Navigate to `http://localhost:3000/plan-event`.
  2. Select Event Type: Choose **"Wedding"**.
  3. Verify Step 2 reveals dynamic questions: Assert presence of *"Indoor or outdoor ceremony?"* (`ceremony_setting`).
  4. Select Services: Check **Photography** and **Catering**.
  5. Provide Location: City = `Mumbai`, Locality = `Bandra West`.
  6. Select Date: Pick a date exactly 6 months in the future. Guest count = `150`.
  7. Fill Host Details: Name = `Aarav Sharma`, Phone = `+91 98765 43210`. Check WhatsApp consent.
  8. Click "Submit Request".
- **Expected Results:**
  - Submission succeeds without screen flicker.
  - User is redirected to `/status/MM-XXXXXXXX` or `/thank-you` displaying their unique public lead ID.
  - Database verification: Query `prisma.lead.findUnique({ where: { publicLeadId } })` shows `status: "SUBMITTED"`, `completenessStatus: "COMPLETE"`, and `locality: "Bandra West"`.
- **Negative Testing:**
  - Submit past date $\rightarrow$ UI must show inline error: *"Please select a valid future event date."*
  - Select "Other" event type $\rightarrow$ Ensure "Please tell us what kind of event this is" appears and blocks submission if blank.

---

### Suite 02: Deterministic Matching & Compatibility Assertions
**Objective:** Ensure matching logic strictly obeys compatibility rules with zero non-deterministic rankings.

- **Pre-conditions:** Lead submitted with City: `Mumbai`, Event: `Wedding`, Services: `['photography']`.
- **Test Steps:**
  1. Open the customer status URL `/status/MM-XXXXXXXX`.
  2. Inspect the "Matched Vendors" section.
  3. Query `lead_vendor_matches` table in database for this `leadId`.
- **Expected Results:**
  - **Vendor Development A** (`dev-vendor-a-00000001`) MUST appear as an eligible match (`eligible: true`).
  - **Vendor Development B** (`Delhi`) MUST NOT appear in the UI. DB check reveals `eligible: false` with reason `CITY_MISMATCH`.
  - **Vendor Development C** (`profileComplete: false`) MUST NOT appear. DB check reveals `eligible: false` with reason `PROFILE_INCOMPLETE`.
  - Verify UI shows the general honesty sentence: *"These vendors matched because they serve your city, handle your event type, and offer the services you requested."*
  - Ensure NO tags such as *"Top Rated"*, *"Best Value"*, or *"Recommended"* appear on any card.

---

### Suite 03: Customer Status Tracking & Phone Number Lookup
**Objective:** Prove that customers can recall their past leads using varied phone number formats.

- **Pre-conditions:** Two leads submitted under the same individual using:
  - Lead 1: `+91 98765 43210`
  - Lead 2: `9876543210`
- **Test Steps:**
  1. Navigate to `/my-requests`.
  2. In the Phone input, enter formatted string: `+91 98765-43210`.
  3. Click "Find My Requests".
- **Expected Results:**
  - Response returns HTTP 200 with an array containing BOTH Lead 1 and Lead 2.
  - UI displays summary cards showing: Event Type, City, Event Date, Status Badge, Matched Count, and Quote Count.
  - Clicking a card navigates directly to `/status/MM-XXXXXXXX`.
- **Negative / Edge Tests:**
  - Enter phone with no leads (`+91 90000 00000`) $\rightarrow$ UI must render honest empty state: *"We couldn't find any event requests for that number."* (No crash or permanent spinner).

---

### Suite 04: Vendor Onboarding, Phone Auth & Profile Completeness
**Objective:** Test phone login, registration, and the 3-field profile completeness gate.

- **Pre-conditions:** Browser in Incognito window.
- **Test Steps:**
  1. Navigate to `/vendor`.
  2. Enter an unregistered phone: `+91 91111 22222`. Submit.
  3. Verify system responds with `{ isNewVendor: true }` and opens the Registration form.
  4. Complete registration: Name = `Starlight Studios`, City = `Mumbai`, Service = `Photography`. Submit.
  5. Inspect Dashboard home: Check the "Profile Completeness" checklist.
- **Expected Results:**
  - Cookie `mm_vendor_session` is set (HTTP-only, Secure in prod).
  - Profile completeness checklist displays:
    - ✗ About bio missing
    - ✗ Starting price not set
    - ✗ Service areas not configured
  - Database: `Vendor.profileComplete` is `false`. Vendor is currently excluded from customer matching.
  6. Navigate to `/vendor/dashboard/edit`. Fill bio, set price to `₹25,000`, add `Bandra, Juhu` as service areas. Save.
  7. Return to Dashboard: Checklist now shows all 3 green checkmarks. Database reflects `Vendor.profileComplete = true`.

---

### Suite 05: Vendor Opportunity Inbox, Expiry & Response
**Objective:** Validate the 48-hour response window, status tab filters, and interest signaling.

- **Pre-conditions:** Vendor has received an opportunity (`VendorOpportunity` with status `SENT`).
- **Test Steps:**
  1. Log in as the vendor and open `/vendor/dashboard/opportunities`.
  2. Verify filter tabs: Click through *All*, *New*, *Viewed*, *Interested*, *Declined*.
  3. Click into the open opportunity.
  4. Verify the 48-hour response countdown banner is visible.
  5. Click "I'm Interested".
- **Expected Results:**
  - Button state transitions to loading: *"Saving..."* before resolving.
  - Green success confirmation appears for ~1.5s.
  - Opportunity status updates to `INTERESTED`.
  - Database: `VendorOpportunity.status` = `INTERESTED`, `respondedAt` is set.
  - Customer view (`/status/[publicLeadId]`): The vendor's card now displays the badge: *"Vendor Interested"*.

---

### Suite 06: Quote Builder, Line Item Currency & Version Revision
**Objective:** Test creation of multi-item quotes, Indian rupee comma grouping, and revision cloning.

- **Pre-conditions:** Opportunity is in `INTERESTED` or `QUOTE_PENDING` status.
- **Test Steps:**
  1. From the opportunity page, click "Create Quote".
  2. Add Line Item 1: Label = `Full Day Candid Photography`, Amount = `50000`.
  3. Add Line Item 2: Label = `Cinematic Drone Video`, Amount = `25000`.
  4. Verify Line Items Table formatting:
     - Item 1 shows `₹50,000`.
     - Item 2 shows `₹25,000`.
     - Total line displays `Total: ₹75,000`.
  5. Set Valid Until date: Pick 30 days ahead. Add inclusions and terms.
  6. Click "Submit Quote to Customer".
- **Expected Results:**
  - Quote submitted successfully. Status becomes `QUOTE_SUBMITTED`.
  - Version 1 is marked `status: SUBMITTED`.
  7. Click "Revise Quote":
     - Verify button displays *"Starting revision..."*.
     - New draft Version 2 is initialized with identical line items. Version 1 remains accessible and unmodified.

---

### Suite 07: Bidirectional Messaging & Disintermediation Interception
**Objective:** Validate that legitimate event questions are delivered while contact details (disintermediation attempts) are blocked in real-time.

- **Pre-conditions:** Quote has been submitted. Both Customer (`/status/[publicLeadId]`) and Vendor (`/vendor/dashboard/opportunities/[id]`) have access to the message thread.
- **Test Steps (Legitimate Chat):**
  1. Customer types: *"Does your package include candid coverage of the sangeet night?"*
  2. Send message.
  3. Refresh vendor dashboard $\rightarrow$ Message appears in thread tagged `CUSTOMER`.
- **Test Steps (Disintermediation Interception):**
  4. Vendor attempts to send: *"Please call me directly on 9876543210 for a discount."*
  5. Send message.
- **Expected Results:**
  - Submission is blocked with HTTP 422.
  - UI displays error banner: *"To protect your booking guarantee, sharing phone numbers or contact details in chat is not permitted."*
  - Database check: No record created in `quote_messages`.
  6. Repeat test with email: *"Email me at studio@gmail.com"* $\rightarrow$ Blocked with identical error.
  7. Repeat test with legitimate budget number: *"The budget for 500 guests is fine"* $\rightarrow$ Permitted.

---

### Suite 08: Booking Request Review, Acceptance & Idempotency
**Objective:** Test the full booking request flow, client-side summary review, and vendor acceptance.

- **Pre-conditions:** Submitted quote exists with valid line items.
- **Test Steps:**
  1. As Customer on `/status/[publicLeadId]`, click "Request Booking".
  2. **Review Modal:** Verify modal shows event date, guest count, vendor name, and line-item breakdown.
  3. Click "Confirm Request".
  4. Status page updates to: *"Waiting for [Vendor] to respond"*.
  5. Log in as Vendor on `/vendor/dashboard/booking-requests`.
  6. Locate the request. Click into detail view.
  7. Click "Accept Booking".
- **Expected Results:**
  - Button transitions to *"Saving..."* followed by emerald confirmation banner.
  - `BookingRequest.status` transitions to `ACCEPTED`.
  - Record created in `bookings` with format `BK-XXXXXXXX`.
  - Record created in `booking_status_history` with `status: CONFIRMED`.
  - Customer reloads page $\rightarrow$ Celebratory card: *"🎉 Booking Confirmed — Booking ID: BK-XXXXXXXX"*.

---

### Suite 09: Double-Booking Prevention & Date Collision Testing
**Objective:** Confirm that accepting a booking blocks the vendor's date, and a second booking on the same date is strictly rejected.

- **Pre-conditions:** Vendor has two pending booking requests from two distinct leads for the **exact same event date** (e.g., `2032-12-15`).
- **Test Steps:**
  1. Open Booking Request 1 in Browser A. Click "Accept Booking".
  2. Verify Request 1 is accepted and confirmed.
  3. Open Booking Request 2 in Browser B. Click "Accept Booking".
- **Expected Results:**
  - Request 2 fails with HTTP 409 Conflict.
  - UI surfaces clear error: *"You already have a confirmed booking on this date."*
  - Database check on `vendor_availability`: Exactly ONE row exists for `(vendorId, 2032-12-15)`. No orphan records created.

---

### Suite 10: Booking Cancellation & Recovery Banner
**Objective:** Verify cancellation mechanics and the customer recovery banner.

- **Pre-conditions:** A booking is in `CONFIRMED` status.
- **Test Steps:**
  1. Customer visits `/status/[publicLeadId]`.
  2. Locate confirmed booking card. Click "Cancel Booking".
  3. Select Reason: *"Date Changed"*. Enter note: *"Postponing to next quarter"*. Confirm.
- **Expected Results:**
  - Booking status transitions to `CANCELLED`.
  - Database: `Booking.status = CANCELLED`, `Booking.cancelledBy = CUSTOMER`.
  - Vendor availability record for that date is cleared/unlocked.
  - Customer status page immediately renders `BookingRecoveryBanner`:
    - Shows message: *"Your booking was cancelled. Here are other available vendors for your event."*
    - Displays alternative matched vendors.

---

### Suite 11: Vendor Consultation Meetings Scheduling
**Objective:** Verify scheduling of discovery calls / consultations between customers and vendors.

- **Test Steps:**
  1. On vendor public profile `/vendors/[vendorId]`, click "Book Consultation".
  2. Select Date, Time Slot (`4:00 PM`), Customer Name, Phone. Submit.
  3. Log in to `/vendor/dashboard/meetings`.
- **Expected Results:**
  - Meeting appears in vendor's consultation roster with status `SCHEDULED`.
  - Vendor can confirm or cancel the consultation.

---

### Suite 12: Admin Moderation, Vendor Vetting & Audit Trails
**Objective:** Test platform administration controls and immutable audit logging.

- **Test Steps:**
  1. Navigate to `/admin/vendors`.
  2. Locate a newly registered vendor with status `PENDING`.
  3. Review uploaded credentials/brochure (`VendorDocument`).
  4. Click "Approve Vendor".
- **Expected Results:**
  - Status updates to `VERIFIED`.
  - Public profile now displays verified badge.
  - Check `audit_logs` table: An entry is inserted with `entityType: "Vendor"`, `action: "VENDOR_VERIFIED"`, `actorType: "ADMIN"`.

---

### Suite 13: Security, IDOR, Session Hijacking & Injection Gates
**Objective:** Execute white-hat penetration assertions across API boundaries.

| Test ID | Vulnerability Vector | Test Procedure | Expected Security Defense |
|---|---|---|---|
| **SEC-01** | **IDOR (Quote Tampering)** | Authenticate as Vendor A. Attempt to execute `POST /api/vendor/opportunities/[Vendor_B_Opp_Id]/quote`. | Must return **403 Forbidden** or **404 Not Found**. Vendor A cannot mutate Vendor B's opportunities. |
| **SEC-02** | **Session Cookie Tampering** | Forge `mm_vendor_session` cookie with random bytes or expired token. Request `/vendor/dashboard`. | Middleware / Layout intercepts invalid token hash. Redirects cleanly to `/vendor`. |
| **SEC-03** | **XSS in Dynamic Input** | Submit Lead with `customerName: "<script>alert(1)</script>"`, `locality: "<img src=x onerror=alert(1)>"`. | React JSX escapes string output. DB stores raw text, UI renders literal tags without execution. |
| **SEC-04** | **Replay Attack (Idempotency)** | Capture `POST /api/leads` payload. Resend identical payload 5 times in parallel using cURL. | 1st request returns `201 Created`. Subsequent 4 requests return `200/409` with identical lead payload. Exactly one DB row created. |
| **SEC-05** | **SQL Injection via Phone Lookup** | Send `POST /api/leads/by-phone` with body `{"phone": "9876543210' OR '1'='1"}`. | Zod schema rejects input with `422 Unprocessable Entity` before database layer is reached. |

---

### Suite 14: Mobile Responsiveness, Viewports & Breakpoints
**Objective:** Verify flawless rendering across mobile, tablet, and desktop viewports.

- **Test Viewports:**
  - Mobile Small: `375px × 667px` (iPhone SE)
  - Mobile Standard: `390px × 844px` (iPhone 14/15)
  - Tablet: `768px × 1024px` (iPad)
  - Desktop: `1280px × 800px`
- **Critical Visual Checks:**
  1. `/vendor/dashboard/*`: Header navigation collapses to responsive mobile drawer or bottom tab bar without overlapping vendor name or status pill.
  2. Opportunity & Booking filter tabs: The tab container must have `overflow-x-auto` with smooth swipe scrolling; tabs must not wrap into multiple cluttered rows.
  3. Quote Builder Line-Item Table: On `375px` screens, the grid columns (`Item | Amount | Action`) must fit without causing horizontal body scrolling. Comma-separated currency amounts must remain legible without wrapping digits.
  4. Status Page Quote Comparison Table: Must scroll horizontally within its card container while keeping the outer page fixed.

---

## 10. Critical Edge Cases, Boundary Conditions & Chaos Scenarios

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   EDGE CASES & BOUNDARY TEST MATRIX                      │
├──────────────────────┬───────────────────────────────────────────────────┤
│ Scenario             │ Expected System Behavior                          │
├──────────────────────┼───────────────────────────────────────────────────┤
│ Boundary Guest Count │ • 0 guests: Rejected by Zod (min 1).              │
│                      │ • 100,000 guests: Permitted (valid mega-wedding). │
│                      │ • 100,001 guests: Rejected by Zod (max 100,000).  │
├──────────────────────┼───────────────────────────────────────────────────┤
│ Negative Quote Price │ • Amount = -500 INR: Rejected by Zod schema.      │
│                      │ • Amount = 0 INR: Permitted only for inclusions.  │
├──────────────────────┼───────────────────────────────────────────────────┤
│ Zero Matched Vendors │ • Lead city has no active vendors:                │
│                      │   - Qualification status remains QUALIFIED.       │
│                      │   - Status page shows honest empty state:         │
│                      │     "We are currently onboarding vendors in your  │
│                      │      area. Our team is reviewing your request."   │
├──────────────────────┼───────────────────────────────────────────────────┤
│ Expired Opportunity  │ • Vendor opens opportunity at hour 49 (after 48h):│
│ Attempted Response   │   - isExpired() returns true.                     │
│                      │   - "I'm Interested" button is disabled.          │
│                      │   - API rejects with 409 Stale/Expired.           │
├──────────────────────┼───────────────────────────────────────────────────┤
│ Large Portfolio File │ • Upload 15MB JPEG: Blocked (max 5MB limit).      │
│                      │ • Upload 13th Photo: Blocked (max 12 limit).      │
│                      │ • Upload .exe renamed to .pdf: MIME check fails.  │
└──────────────────────┴───────────────────────────────────────────────────┘
```

---

## 11. Troubleshooting, Observability & Debugging Runbook

### 11.1 Diagnostic CLI Inspection Scripts
For rapid investigation of database state during local or staging QA, use the root utility scripts:
```bash
# Check Baba DJ's exact database flags and opportunity count
node _check_babadj.mjs

# Inspect two leads and compare their vendor matches side-by-side
node _debug_two_leads.mjs

# Compare creation timestamps between leads and vendors
node _check_timing.mjs
```

### 11.2 Common Failure Modes & Quick Remediation
| Symptom | Root Cause | Remediation Procedure |
|---|---|---|
| **Turbopack Dev Cache Corruption** (`.next` build errors or module not found) | Concurrently running `npm run build` while `npm run dev` was active. | 1. Terminate all running node processes.<br>2. Delete `.next` directory: `rmdir /s /q .next`<br>3. Restart dev server: `npm run dev` |
| **Vendor Match Returns Empty** | `Vendor.profileComplete` is `false` or city name has trailing whitespace. | Check `Vendor.profileComplete` in DB. Ensure `about`, `startingPrice`, and `serviceAreas` are all populated. |
| **Port Already In Use (`EADDRINUSE 3000` or `3055`)** | Previous test run shell was killed but child `next dev` process remained. | Run on Windows PowerShell:<br>`Get-Process node \| Stop-Process -Force` |
| **Phone Lookup Fails on Known Customer** | Phone stored with spaces/dashes; query ran exact string match without fallback. | Verify `normalizePhoneLast10()` is invoked. Check the raw phone string in `leads` table. |

---

## 12. Defect Severity Matrix, Triage & Production Sign-Off Checklist

### 12.1 Defect Classification Standard
- **P0 — Blocker (Ship-Stopper):**
  - Data corruption or transaction failure.
  - Double-booking allowed on identical vendor/date.
  - Idempotency failure resulting in duplicate charges or duplicate bookings.
  - Security bypass / IDOR allowing unauthorized quote or booking tampering.
- **P1 — Critical:**
  - Deterministic matching engine failure (e.g. city mismatch shown as match).
  - Anti-disintermediation filter failing to block phone numbers or emails.
  - Vendor unable to accept booking or submit quote.
- **P2 — Major:**
  - Currency formatting missing comma groupings (`₹25000` instead of `₹25,000`).
  - Filter tabs in vendor dashboard showing inaccurate record counts.
  - Mobile overflow or clipped layout at 375px width.
- **P3 — Minor:**
  - Minor typographic discrepancies, copy improvements, or non-blocking animations.

---

### 12.2 Standard Defect Report Template
```markdown
### [BUG-ID] Short Descriptive Title

- **Severity:** P0 / P1 / P2 / P3
- **Environment:** Local / Staging / Production
- **Device / Viewport:** Chrome 120 / Desktop (1440px) or Mobile (375px)
- **Actor:** Customer / Vendor / Admin
- **Lead / Booking ID:** MM-XXXXXXXX / BK-XXXXXXXX

#### Steps to Reproduce:
1. Navigate to ...
2. Input payload ...
3. Click on ...

#### Expected Result:
System should ...

#### Actual Result:
System did ...

#### Evidence / Network Payload:
- Request: `POST /api/...` Payload: `{ ... }`
- Response: Status `500 Internal Server Error`, Body: `{ ... }`
- Screenshot / Video link:

#### Database State:
```json
{
  "leadId": "...",
  "status": "...",
  "matches": []
}
```
```

---

### 12.3 Production Release Sign-Off Gate
Before any branch is deployed to production, the QA Lead must certify:

- [ ] **Automated Tests:** 23 Vitest suites (200+ unit tests) pass 100% green.
- [ ] **Integration Tests:** `npm run test:integration` completes with 0 errors.
- [ ] **E2E Journeys:** Playwright booking journey passes against clean DB.
- [ ] **Static Analysis:** `npx tsc --noEmit` and `npm run lint` return zero warnings.
- [ ] **Security Audits:** IDOR and disintermediation regex tests verified.
- [ ] **Double-Booking Prevention:** Verified against composite database constraints.
- [ ] **Mobile Parity:** Tested across 375px, 390px, and 768px viewports.
- [ ] **Legal / Trust Review:** All visible trust claims adhere to `TRUST_CLAIMS` registry.

---
*Playbook Maintained by MuggedMoments Core Engineering & Quality Architecture.*
