/**
 * MuggedMoments — Integration test: vendor accept flow (Stage 19, Phase 19.7.7)
 *
 * First slice of this repo's integration suite — not full coverage of Stage 19,
 * disclosed as such. Proves the harness genuinely works: a real `next dev`
 * server, a real local Postgres database via Prisma, real HTTP requests, real
 * DB-state assertions — the exact manual technique used throughout this
 * project's phase-by-phase testing, now automated and repeatable instead of
 * living only in a chat transcript.
 *
 * Covers the two most important, previously-only-manually-tested behaviors of
 * the accept route (Stage 19, Phase 19.1): the happy path, and the
 * VendorAvailability double-booking guard (@@unique([vendorId, date])).
 *
 * All fixture rows are tagged with a run-unique suffix and deleted in
 * afterAll, in FK-safe order, so this test is rerunnable and never leaves
 * permanent state in the shared dev database.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, execSync, type ChildProcess } from "child_process";
import { randomUUID } from "crypto";
import prisma from "@/lib/db/prisma";

const PORT = 3055;
const BASE_URL = `http://localhost:${PORT}`;
// PublicLeadIdSchema requires exactly 8 [A-Z0-9] chars after "MM-" — a 4-char
// run tag (for grouping/debugging this run's fixtures) + a 4-digit sequence.
const RUN_ID = randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
let fixtureSequence = 0;

let serverProcess: ChildProcess | undefined;
const leadIds: string[] = [];
const vendorAvailabilityKeys: { vendorId: string; date: Date }[] = [];

/**
 * `spawn(..., { shell: true })` on Windows makes `serverProcess` the *shell*
 * wrapping the real `next` process — `serverProcess.kill()` only kills the
 * shell and leaves `next dev` (and the port) running behind it. Confirmed
 * live: port 3055 was still LISTENING after a first run of this suite used a
 * plain `.kill()`. `taskkill /T` kills the whole process tree; POSIX doesn't
 * have this problem the same way, so `.kill()` is used there instead.
 */
function killServerTree(proc: ChildProcess): void {
  if (!proc.pid) return;
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /pid ${proc.pid} /T /F`);
    } catch {
      // Best-effort — if the process already exited, taskkill errors, which
      // is fine.
    }
  } else {
    proc.kill();
  }
}

async function waitForServerReady(timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/leads/MM-00000000`);
      // Any HTTP response (even 404) means the server is up and routing.
      if (res.status) return;
    } catch {
      // Not up yet — keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Dev server did not become ready within ${timeoutMs}ms`);
}

async function createFixtureChain(options: {
  vendorId: string;
  eventDate: Date;
}): Promise<{ bookingRequestId: string }> {
  const eventType = await prisma.eventType.findFirst({ where: { slug: "wedding" } });
  if (!eventType) throw new Error("Seed data missing: no 'wedding' event type found.");

  fixtureSequence += 1;
  const publicLeadId = `MM-${RUN_ID}${String(fixtureSequence).padStart(4, "0")}`;

  const lead = await prisma.lead.create({
    data: {
      publicLeadId,
      eventTypeId: eventType.id,
      city: "Lucknow",
      eventDate: options.eventDate,
      guestCount: 40,
      services: ["photography"],
      customerName: "Integration Test Customer",
      phone: "+919999900000",
      whatsappConsent: false,
      status: "SUBMITTED",
      completenessStatus: "COMPLETE",
    },
  });
  leadIds.push(lead.id);

  const opportunity = await prisma.vendorOpportunity.create({
    data: {
      leadId: lead.id,
      vendorId: options.vendorId,
      status: "QUOTE_SUBMITTED",
      responseDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      viewedAt: new Date(),
      respondedAt: new Date(),
    },
  });

  const quote = await prisma.quote.create({ data: { opportunityId: opportunity.id } });

  const version = await prisma.quoteVersion.create({
    data: {
      quoteId: quote.id,
      versionNumber: 1,
      status: "SUBMITTED",
      availabilityState: "AVAILABLE",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      submittedAt: new Date(),
      lineItems: { create: [{ label: "Package", amount: 10000, order: 0 }] },
    },
  });

  const bookingRequest = await prisma.bookingRequest.create({
    data: {
      idempotencyKey: randomUUID(),
      opportunityId: opportunity.id,
      quoteVersionId: version.id,
      responseDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  return { bookingRequestId: bookingRequest.id };
}

const vendorSessionTokenHashes: string[] = [];

async function createVendorSession(vendorId: string): Promise<string> {
  const { createHash, randomBytes } = await import("crypto");
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  await prisma.vendorSession.create({
    data: { vendorId, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  vendorSessionTokenHashes.push(tokenHash);
  return rawToken;
}

describe("Integration: POST /api/vendor/booking-requests/[id]/accept", () => {
  beforeAll(async () => {
    serverProcess = spawn("npx", ["next", "dev", "-p", String(PORT)], {
      shell: true,
      cwd: process.cwd(),
      stdio: "ignore",
    });
    await waitForServerReady(45_000);
  });

  afterAll(async () => {
    if (serverProcess) {
      killServerTree(serverProcess);
    }

    // FK-safe cleanup order, scoped to only rows this test file created.
    const bookings = await prisma.booking.findMany({
      where: { bookingRequest: { opportunity: { leadId: { in: leadIds } } } },
      select: { id: true },
    });
    const bookingIds = bookings.map((b) => b.id);
    if (bookingIds.length > 0) {
      await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
    }
    await prisma.bookingRequest.deleteMany({ where: { opportunity: { leadId: { in: leadIds } } } });
    await prisma.quoteLineItem.deleteMany({
      where: { quoteVersion: { quote: { opportunity: { leadId: { in: leadIds } } } } },
    });
    await prisma.quoteVersion.deleteMany({
      where: { quote: { opportunity: { leadId: { in: leadIds } } } },
    });
    await prisma.quote.deleteMany({ where: { opportunity: { leadId: { in: leadIds } } } });
    await prisma.vendorOpportunity.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });

    for (const { vendorId, date } of vendorAvailabilityKeys) {
      await prisma.vendorAvailability.deleteMany({ where: { vendorId, date } });
    }

    if (vendorSessionTokenHashes.length > 0) {
      await prisma.vendorSession.deleteMany({ where: { tokenHash: { in: vendorSessionTokenHashes } } });
    }

    await prisma.$disconnect();
  }, 60_000);

  it("accepts a booking request and persists Booking + BookingStatusHistory correctly", async () => {
    const vendorId = "dev-vendor-c-00000003";
    const eventDate = new Date("2031-06-01T00:00:00.000Z");
    vendorAvailabilityKeys.push({ vendorId, date: eventDate });

    const { bookingRequestId } = await createFixtureChain({ vendorId, eventDate });
    const token = await createVendorSession(vendorId);

    const res = await fetch(`${BASE_URL}/api/vendor/booking-requests/${bookingRequestId}/accept`, {
      method: "POST",
      headers: { Cookie: `mm_vendor_session=${token}` },
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe("CONFIRMED");

    const booking = await prisma.booking.findUnique({
      where: { bookingRequestId },
      include: { statusHistory: true },
    });
    expect(booking).not.toBeNull();
    expect(booking!.status).toBe("CONFIRMED");
    expect(booking!.publicBookingId).toMatch(/^BK-[A-Z0-9]{8}$/);
    expect(booking!.statusHistory).toHaveLength(1);
    expect(booking!.statusHistory[0].status).toBe("CONFIRMED");

    const updatedRequest = await prisma.bookingRequest.findUnique({ where: { id: bookingRequestId } });
    expect(updatedRequest!.status).toBe("ACCEPTED");

    const availability = await prisma.vendorAvailability.findUnique({
      where: { vendorId_date: { vendorId, date: eventDate } },
    });
    expect(availability!.status).toBe("UNAVAILABLE");
  });

  it("rejects a second accept for the same vendor+date with DATE_ALREADY_BOOKED", async () => {
    const vendorId = "dev-vendor-c-00000003";
    const eventDate = new Date("2031-07-15T00:00:00.000Z");
    vendorAvailabilityKeys.push({ vendorId, date: eventDate });

    const first = await createFixtureChain({ vendorId, eventDate });
    const second = await createFixtureChain({ vendorId, eventDate });
    const token = await createVendorSession(vendorId);

    const firstRes = await fetch(
      `${BASE_URL}/api/vendor/booking-requests/${first.bookingRequestId}/accept`,
      { method: "POST", headers: { Cookie: `mm_vendor_session=${token}` } }
    );
    expect(firstRes.status).toBe(201);

    const secondRes = await fetch(
      `${BASE_URL}/api/vendor/booking-requests/${second.bookingRequestId}/accept`,
      { method: "POST", headers: { Cookie: `mm_vendor_session=${token}` } }
    );
    const secondBody = await secondRes.json();

    expect(secondRes.status).toBe(409);
    expect(secondBody.error.code).toBe("DATE_ALREADY_BOOKED");

    const secondBooking = await prisma.booking.findUnique({
      where: { bookingRequestId: second.bookingRequestId },
    });
    expect(secondBooking).toBeNull();
  });
});
