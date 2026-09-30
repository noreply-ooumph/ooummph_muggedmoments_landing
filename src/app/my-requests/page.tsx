/**
 * MuggedMoments — /my-requests
 *
 * Customer-facing "check my status by phone" entry point (Stage 20). Thin server
 * wrapper carrying only `metadata` — same server/client split already used by
 * /plan-event (PlanEventClient.tsx), since a server component can't hold the
 * interactive form state this page needs.
 */

import type { Metadata } from "next";
import { MyRequestsClient } from "./MyRequestsClient";

export const metadata: Metadata = {
  title: "Check My Status",
  description: "Look up your MuggedMoments event requests by phone number.",
};

export default function MyRequestsPage() {
  return <MyRequestsClient />;
}
