/**
 * MuggedMoments — Database Seed
 *
 * ⚠️  DEVELOPMENT ONLY — SEED DATA ⚠️
 * This data is for development and testing purposes only.
 * It must NEVER appear in production as real MuggedMoments data.
 * Vendors are clearly flagged with isDevelopmentSeed=true.
 *
 * Seeds:
 * - Event Types (Wedding, Birthday, Corporate Event)
 * - Services (Photography, Catering, etc.)
 * - Scoring Rules (weights=0, CONFIGURATION_REQUIRED)
 * - Development Vendor A (AVAILABLE)
 * - Development Vendor B (UNAVAILABLE)
 * - Development Vendor C (no availability record = UNKNOWN)
 *
 * This allows testing MATCH / NO MATCH / AVAILABLE / UNAVAILABLE / UNKNOWN
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting DEVELOPMENT ONLY seed...\n");

  // ============================================================
  // EVENT TYPES
  // ============================================================

  const wedding = await prisma.eventType.upsert({
    where: { slug: "wedding" },
    update: { name: "Wedding", active: true, order: 1 },
    create: { slug: "wedding", name: "Wedding", active: true, order: 1 },
  });

  const birthday = await prisma.eventType.upsert({
    where: { slug: "birthday" },
    update: { name: "Birthday", active: true, order: 2 },
    create: { slug: "birthday", name: "Birthday", active: true, order: 2 },
  });

  const corporate = await prisma.eventType.upsert({
    where: { slug: "corporate" },
    update: { name: "Corporate Event", active: true, order: 3 },
    create: { slug: "corporate", name: "Corporate Event", active: true, order: 3 },
  });

  // "Other" — catch-all for a customer-typed custom event name (see
  // Lead.customEventTypeName). Matching treats this event type specially
  // (skips the event_type dimension entirely) since no vendor can pre-declare
  // support for an unbounded custom category — see matchingService.ts.
  const other = await prisma.eventType.upsert({
    where: { slug: "other" },
    update: { name: "Other", active: true, order: 4 },
    create: { slug: "other", name: "Other", active: true, order: 4 },
  });

  console.log("✅ Event types seeded:", [wedding.slug, birthday.slug, corporate.slug, other.slug]);

  // ============================================================
  // SERVICES
  // ============================================================

  const serviceData = [
    { slug: "after-party", name: "After Party", order: 1 },
    { slug: "bar", name: "Bar", order: 2 },
    { slug: "photography", name: "Photography", order: 3 },
    { slug: "videography", name: "Videography", order: 4 },
    { slug: "catering", name: "Catering", order: 5 },
    { slug: "decoration", name: "Decoration", order: 6 },
    { slug: "venue", name: "Venue", order: 7 },
    { slug: "music-dj", name: "Music / DJ", order: 8 },
    { slug: "makeup", name: "Makeup & Hair", order: 9 },
    { slug: "flowers", name: "Flowers & Floral Design", order: 10 },
  ];

  const services: Record<string, { id: string; slug: string }> = {};

  for (const s of serviceData) {
    const svc = await prisma.service.upsert({
      where: { slug: s.slug },
      update: { name: s.name, active: true, order: s.order },
      create: { slug: s.slug, name: s.name, active: true, order: s.order },
    });
    services[s.slug] = { id: svc.id, slug: svc.slug };
  }

  console.log("✅ Services seeded:", Object.keys(services));

  // ============================================================
  // DYNAMIC QUESTIONS (example, dev-only)
  //
  // Demonstrates automation #4 (Dynamic Form Questions): scoped to the "wedding"
  // event type only, so selecting Wedding in the form shows this extra step and
  // selecting Birthday/Corporate does not.
  // ============================================================

  await prisma.question.upsert({
    where: { questionKey: "ceremony_setting" },
    update: {
      eventTypeId: wedding.id,
      label: "Indoor or outdoor ceremony?",
      fieldType: "select",
      required: false,
      options: [
        { value: "indoor", label: "Indoor" },
        { value: "outdoor", label: "Outdoor" },
        { value: "both", label: "Both" },
      ],
      order: 1,
      active: true,
    },
    create: {
      questionKey: "ceremony_setting",
      eventTypeId: wedding.id,
      label: "Indoor or outdoor ceremony?",
      fieldType: "select",
      required: false,
      options: [
        { value: "indoor", label: "Indoor" },
        { value: "outdoor", label: "Outdoor" },
        { value: "both", label: "Both" },
      ],
      order: 1,
      active: true,
    },
  });

  console.log("✅ Dynamic questions seeded: [ceremony_setting -> wedding]");

  // ============================================================
  // DEVELOPMENT VENDORS
  //
  // These are NOT real MuggedMoments vendors.
  // isDevelopmentSeed=true ensures they can be identified and excluded
  // from production use.
  //
  // Vendor A: Photography + Catering in Mumbai — for testing MATCH + AVAILABLE
  // Vendor B: Photography in Delhi — for testing CITY_MISMATCH + UNAVAILABLE
  // Vendor C: Decoration in Mumbai — for testing SERVICE_MISMATCH + UNKNOWN
  // ============================================================

  const vendorA = await prisma.vendor.upsert({
    where: { id: "dev-vendor-a-00000001" },
    update: {
      name: "[DEVELOPMENT SEED] Vendor Development A",
      city: "Mumbai",
      profileComplete: true,
      active: true,
      isDevelopmentSeed: true,
    },
    create: {
      id: "dev-vendor-a-00000001",
      name: "[DEVELOPMENT SEED] Vendor Development A",
      city: "Mumbai",
      profileComplete: true,
      active: true,
      isDevelopmentSeed: true,
    },
  });

  const vendorB = await prisma.vendor.upsert({
    where: { id: "dev-vendor-b-00000002" },
    update: {
      name: "[DEVELOPMENT SEED] Vendor Development B",
      city: "Delhi",
      profileComplete: true,
      active: true,
      isDevelopmentSeed: true,
    },
    create: {
      id: "dev-vendor-b-00000002",
      name: "[DEVELOPMENT SEED] Vendor Development B",
      city: "Delhi",
      profileComplete: true,
      active: true,
      isDevelopmentSeed: true,
    },
  });

  const vendorC = await prisma.vendor.upsert({
    where: { id: "dev-vendor-c-00000003" },
    update: {
      name: "[DEVELOPMENT SEED] Vendor Development C",
      city: "Mumbai",
      profileComplete: false,
      active: true,
      isDevelopmentSeed: true,
    },
    create: {
      id: "dev-vendor-c-00000003",
      name: "[DEVELOPMENT SEED] Vendor Development C",
      city: "Mumbai",
      profileComplete: false,
      active: true,
      isDevelopmentSeed: true,
    },
  });

  console.log("✅ Development vendors seeded:", [vendorA.id, vendorB.id, vendorC.id]);

  // ============================================================
  // VENDOR SERVICES (development only)
  // ============================================================

  // Vendor A: Photography + Catering, supports Wedding + Birthday
  await prisma.vendorService.upsert({
    where: { vendorId_serviceId: { vendorId: vendorA.id, serviceId: services["photography"].id } },
    update: { eventTypes: ["wedding", "birthday"] },
    create: { vendorId: vendorA.id, serviceId: services["photography"].id, eventTypes: ["wedding", "birthday"] },
  });
  await prisma.vendorService.upsert({
    where: { vendorId_serviceId: { vendorId: vendorA.id, serviceId: services["catering"].id } },
    update: { eventTypes: ["wedding", "birthday"] },
    create: { vendorId: vendorA.id, serviceId: services["catering"].id, eventTypes: ["wedding", "birthday"] },
  });

  // Vendor B: Photography, supports Wedding + Corporate
  await prisma.vendorService.upsert({
    where: { vendorId_serviceId: { vendorId: vendorB.id, serviceId: services["photography"].id } },
    update: { eventTypes: ["wedding", "corporate"] },
    create: { vendorId: vendorB.id, serviceId: services["photography"].id, eventTypes: ["wedding", "corporate"] },
  });

  // Vendor C: Decoration, supports Birthday + Corporate
  await prisma.vendorService.upsert({
    where: { vendorId_serviceId: { vendorId: vendorC.id, serviceId: services["decoration"].id } },
    update: { eventTypes: ["birthday", "corporate"] },
    create: { vendorId: vendorC.id, serviceId: services["decoration"].id, eventTypes: ["birthday", "corporate"] },
  });

  console.log("✅ Vendor services seeded");

  // ============================================================
  // VENDOR AVAILABILITY (development testing)
  //
  // Test date: 2027-06-15
  // Vendor A: AVAILABLE (explicit record)
  // Vendor B: UNAVAILABLE (explicit record)
  // Vendor C: no record = UNKNOWN (critical behavior test)
  // ============================================================

  const testDate = new Date("2027-06-15T00:00:00.000Z");

  await prisma.vendorAvailability.upsert({
    where: { vendorId_date: { vendorId: vendorA.id, date: testDate } },
    update: { status: "AVAILABLE", source: "DEVELOPMENT_SEED" },
    create: { vendorId: vendorA.id, date: testDate, status: "AVAILABLE", source: "DEVELOPMENT_SEED" },
  });

  await prisma.vendorAvailability.upsert({
    where: { vendorId_date: { vendorId: vendorB.id, date: testDate } },
    update: { status: "UNAVAILABLE", source: "DEVELOPMENT_SEED" },
    create: { vendorId: vendorB.id, date: testDate, status: "UNAVAILABLE", source: "DEVELOPMENT_SEED" },
  });

  // Vendor C intentionally has NO availability record for testDate
  // This tests that UNKNOWN is returned (not AVAILABLE) when no record exists
  console.log("✅ Vendor availability seeded (Vendor C has no record — tests UNKNOWN state)");

  console.log("\n🌱 DEVELOPMENT SEED COMPLETE");
  console.log("⚠️  These records are for development/testing only.");
  console.log("⚠️  Remove isDevelopmentSeed=true vendors before production launch.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
