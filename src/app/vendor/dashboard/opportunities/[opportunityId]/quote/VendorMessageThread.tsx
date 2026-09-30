/**
 * MuggedMoments — Vendor Message Thread Wrapper (Stage 18, Phase 18.5)
 *
 * Thin client wrapper bridging the shared MessageThread component to the
 * vendor-facing send endpoint — same "small client component providing the
 * site-specific data-fetching behavior" pattern already used by
 * OpportunityActions.tsx and LogoutButton.tsx.
 */

"use client";

import { useRouter } from "next/navigation";
import { MessageThread } from "@/components/quotes/MessageThread";

interface Message {
  senderType: "CUSTOMER" | "VENDOR";
  body: string;
  createdAt: string;
}

export function VendorMessageThread({
  opportunityId,
  messages,
}: {
  opportunityId: string;
  messages: Message[];
}) {
  const router = useRouter();

  async function handleSend(body: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/vendor/opportunities/${opportunityId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { ok: false, error: json?.error?.message ?? "Could not send message." };
      }
      router.refresh();
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the server. Please try again." };
    }
  }

  return <MessageThread messages={messages} viewerSenderType="VENDOR" onSend={handleSend} />;
}
