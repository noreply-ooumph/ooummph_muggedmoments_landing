-- Stage 18, Phase 18.5 — quote Q&A messaging. Purely additive, no existing table touched.
CREATE TYPE "MessageSenderType" AS ENUM ('CUSTOMER', 'VENDOR');

CREATE TABLE "quote_messages" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "sender_type" "MessageSenderType" NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quote_messages_quote_id_idx" ON "quote_messages"("quote_id");

ALTER TABLE "quote_messages"
  ADD CONSTRAINT "quote_messages_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
