/**
 * MuggedMoments — /vendor (Vendor Auth)
 *
 * Server component wrapper carrying route metadata — title and description
 * for the vendor portal login and registration page. Client interaction
 * handled by VendorAuthClient.
 */

import type { Metadata } from "next";
import { VendorAuthClient } from "./VendorAuthClient";

export const metadata: Metadata = {
  title: "Vendor Portal",
  description:
    "Sign in or register to access your MuggedMoments vendor dashboard, view incoming client leads, submit quotes, and manage bookings.",
};

export default function VendorPage() {
  return <VendorAuthClient />;
}
