/**
 * MuggedMoments — Vendor Session Helper (Stage 16 prerequisite: Vendor Auth)
 *
 * No Next.js middleware is used anywhere in this codebase — session validation happens
 * inside each server page/route that needs it, by calling getVendorSession() directly.
 *
 * The session cookie stores only an opaque random token; the database stores only its
 * SHA-256 hash (see otpService.ts::hashSessionToken) — a database read alone can never
 * be used to impersonate a session.
 */

import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import prisma from "@/lib/db/prisma";
import { hashSessionToken } from "@/domain/vendorAuth/otpService";

export const VENDOR_SESSION_COOKIE = "mm_vendor_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Creates a new session for the given vendor, sets the cookie on the current response,
 * and persists the hashed token. Returns nothing — callers don't need the raw token,
 * it's already in the cookie.
 */
export async function createVendorSession(vendorId: string): Promise<void> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.vendorSession.create({
    data: { vendorId, tokenHash, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(VENDOR_SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Reads the session cookie (if any), validates it against VendorSession, and returns
 * the vendor id — or null if there is no valid session. Never throws.
 */
export async function getVendorSession(): Promise<{ vendorId: string } | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(VENDOR_SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const session = await prisma.vendorSession.findUnique({
    where: { tokenHash },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;

  return { vendorId: session.vendorId };
}

/**
 * Clears the session cookie and deletes the corresponding VendorSession row, if any.
 */
export async function destroyVendorSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(VENDOR_SESSION_COOKIE)?.value;

  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    await prisma.vendorSession.deleteMany({ where: { tokenHash } });
  }

  cookieStore.delete(VENDOR_SESSION_COOKIE);
}
