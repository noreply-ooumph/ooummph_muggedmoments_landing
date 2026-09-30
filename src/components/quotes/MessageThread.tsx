/**
 * MuggedMoments — Message Thread (Stage 18, Phase 18.5)
 *
 * Shared presentational component for the quote Q&A thread — both the customer
 * status page and the vendor quote builder page render this, parameterized by
 * onSend and viewerSenderType. Plain request/response, reload-to-see-new-messages —
 * no read receipts, no typing indicators, no real-time delivery.
 */

"use client";

import { useState } from "react";

interface Message {
  senderType: "CUSTOMER" | "VENDOR";
  body: string;
  createdAt: string;
}

interface MessageThreadProps {
  messages: Message[];
  onSend: (body: string) => Promise<{ ok: boolean; error?: string }>;
  viewerSenderType: "CUSTOMER" | "VENDOR";
}

export function MessageThread({ messages, onSend, viewerSenderType }: MessageThreadProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!body.trim()) return;
    setError(null);
    setSending(true);
    try {
      const result = await onSend(body.trim());
      if (!result.ok) {
        setError(result.error ?? "Could not send message.");
        return;
      }
      setBody("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {messages.length > 0 && (
        <div className="space-y-2">
          {messages.map((message, index) => {
            const isViewer = message.senderType === viewerSenderType;
            return (
              <div
                key={index}
                className={`flex ${isViewer ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    isViewer
                      ? "bg-zinc-700 text-zinc-100"
                      : "bg-zinc-800 text-zinc-200 border border-zinc-700"
                  }`}
                >
                  <p>{message.body}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {new Date(message.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md p-2">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
          maxLength={1000}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1 rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !body.trim()}
          className="rounded-md bg-zinc-700 text-zinc-100 px-3 py-2 text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
