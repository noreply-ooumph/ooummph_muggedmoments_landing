/**
 * MuggedMoments — E2E: the Stage 19 booking journey (Phase 19.7.7)
 *
 * First slice of this repo's e2e suite. "The complete journey" is scoped here
 * to Stage 19's booking flow specifically (request → accept → confirmation) —
 * not the whole Stage 1-18 intake funnel, which is a separate, already-built
 * feature set outside Stage 19's scope. Seeding a lead/quote directly via
 * Prisma (rather than re-driving the multi-step intake form through the
 * browser) keeps this test focused on what Stage 19 actually added, and
 * avoids re-testing Stage 1-18's own already-covered behavior.
 *
 * Only the customer side is driven through the real browser UI. The vendor's
 * "accept" step uses a direct API call (via Playwright's request fixture)
 * rather than a second authenticated browser session — this is disclosed,
 * not hidden: it keeps the test fast and reliable while still exercising the
 * real production route, the same one the vendor UI itself calls.
 *
 * Fixture creation duplicates tests/integration/bookingAccept.integration.
 * test.ts's own logic rather than sharing a helper module — a reasonable
 * "first slice" tradeoff (avoids touching that already-verified, passing
 * file just for DRY's sake) that a later phase could clean up by extracting
 * a shared tests/helpers/bookingFixtures.ts.
 */

import { test, expect } from "@playwright/test";
import { randomUUID, createHash, randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const RUN_ID = randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();

test.describe("Stage 19 booking journey", () => {
  let leadId: string;
  let publicLeadId: string;
  let vendorId: string;
  let bookingRequestId: string;
  let vendorTokenHash: string;
  let eventDate: Date;

  test.beforeAll(async () => {
    vendorId = "dev-vendor-c-00000003";
    eventDate = new Date("2032-02-14T00:00:00.000Z");
    publicLeadId = `MM-${RUN_ID}E2E1`.slice(0, 11);

    const eventType = await prisma.eventType.findFirst({ where: { slug: "wedding" } });
    if (!eventType) throw new Error("Seed data missing: no 'wedding' event type found.");

    const lead = await prisma.lead.create({
      data: {
        publicLeadId,
        eventTypeId: eventType.id,
        city: "Lucknow",
        eventDate,
        guestCount: 80,
        services: ["photography"],
        customerName: "E2E Test Customer",
        phone: "+919999900001",
        whatsappConsent: false,
        status: "SUBMITTED",
        completenessStatus: "COMPLETE",
      },
    });
    leadId = lead.id;

    const opportunity = await prisma.vendorOpportunity.create({
      data: {
        leadId: lead.id,
        vendorId,
        status: "QUOTE_SUBMITTED",
        responseDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        viewedAt: new Date(),
        respondedAt: new Date(),
      },
    });

    const quote = await prisma.quote.create({ data: { opportunityId: opportunity.id } });

    await prisma.quoteVersion.create({
      data: {
        quoteId: quote.id,
        versionNumber: 1,
        status: "SUBMITTED",
        availabilityState: "AVAILABLE",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(),
        lineItems: { create: [{ label: "Package", amount: 25000, order: 0 }] },
      },
    });

    const rawToken = randomBytes(32).toString("hex");
    vendorTokenHash = createHash("sha256").update(rawToken).digest("hex");
    await prisma.vendorSession.create({
      data: { vendorId, tokenHash: vendorTokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });

    // Stash the raw token via a module-scope var for the accept step below.
    (globalThis as { __e2eVendorToken?: string }).__e2eVendorToken = rawToken;
  });

  test.afterAll(async () => {
    if (bookingRequestId) {
      const booking = await prisma.booking.findUnique({ where: { bookingRequestId } });
      if (booking) {
        await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: booking.id } });
        await prisma.booking.deleteMany({ where: { id: booking.id } });
      }
    }
    await prisma.bookingRequest.deleteMany({ where: { opportunity: { leadId } } });
    await prisma.quoteLineItem.deleteMany({ where: { quoteVersion: { quote: { opportunity: { leadId } } } } });
    await prisma.quoteVersion.deleteMany({ where: { quote: { opportunity: { leadId } } } });
    await prisma.quote.deleteMany({ where: { opportunity: { leadId } } });
    await prisma.vendorOpportunity.deleteMany({ where: { leadId } });
    await prisma.lead.deleteMany({ where: { id: leadId } });
    await prisma.vendorAvailability.deleteMany({ where: { vendorId, date: eventDate } });
    await prisma.vendorSession.deleteMany({ where: { tokenHash: vendorTokenHash } });
    await prisma.$disconnect();
  });

  test("customer requests a booking, vendor accepts, customer sees confirmation", async ({ page, request }) => {
    await page.goto(`/status/${publicLeadId}`);

    await expect(page.getByText("Your Event Request")).toBeVisible();
    await page.getByRole("button", { name: "Request Booking" }).click();

    // Review screen (Phase 19.7.1) — confirm the customer's own event details
    // are shown before they commit.
    await expect(page.getByText("Event: Wedding")).toBeVisible();
    await expect(page.getByText("Guests: 80")).toBeVisible();

    await page.getByRole("button", { name: "Confirm Request" }).click();
    await expect(page.getByText(/Waiting for .* to respond/)).toBeVisible();

    // Fetch the bookingRequestId now that it exists, for the vendor's accept step.
    const br = await prisma.bookingRequest.findFirst({
      where: { opportunity: { leadId } },
      orderBy: { createdAt: "desc" },
    });
    if (!br) throw new Error("Booking request was not created.");
    bookingRequestId = br.id;

    // Vendor accepts via a direct API call (see file-level doc comment for why).
    const rawToken = (globalThis as { __e2eVendorToken?: string }).__e2eVendorToken;
    const acceptRes = await request.post(`/api/vendor/booking-requests/${bookingRequestId}/accept`, {
      headers: { Cookie: `mm_vendor_session=${rawToken}` },
    });
    expect(acceptRes.status()).toBe(201);

    // Customer reloads and sees the confirmation (Phase 19.2/19.7.3).
    await page.reload();
    await expect(page.getByText("My Booking")).toBeVisible();
    await expect(page.getByText("🎉 Booking Confirmed")).toBeVisible();
    await expect(page.getByText(/Booking ID: BK-[A-Z0-9]{8}/)).toBeVisible();
  });
});
