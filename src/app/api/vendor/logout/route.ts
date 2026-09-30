/**
 * MuggedMoments — POST /api/vendor/logout
 *
 * Destroys the current vendor session (cookie + VendorSession row, if any).
 * Always returns success — logging out of a session that doesn't exist is not an error.
 */

import { NextResponse } from "next/server";
import { destroyVendorSession } from "@/lib/vendorSession";

export async function POST(): Promise<NextResponse> {
  await destroyVendorSession();
  return NextResponse.json({ success: true }, { status: 200 });
}
