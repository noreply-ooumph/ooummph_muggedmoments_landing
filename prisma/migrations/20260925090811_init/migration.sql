-- CreateEnum
CREATE TYPE "QualificationStatus" AS ENUM ('CAPTURED', 'INCOMPLETE', 'QUALIFICATION_PENDING', 'COMPLETE', 'QUALIFIED', 'MATCHING', 'ROUTED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'MATCHED', 'CLOSED', 'INVALID');

-- CreateEnum
CREATE TYPE "CompletenessStatus" AS ENUM ('PENDING', 'COMPLETE', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "event_types" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "question_key" TEXT NOT NULL,
    "event_type_id" TEXT,
    "label" TEXT NOT NULL,
    "field_type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "display_condition" JSONB,
    "validation_rule" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "public_lead_id" TEXT NOT NULL,
    "idempotency_key" TEXT,
    "event_type_id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "event_date" TIMESTAMP(3),
    "guest_count" INTEGER,
    "budget" TEXT,
    "services" TEXT[],
    "customer_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp_consent" BOOLEAN NOT NULL DEFAULT false,
    "email_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "sms_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "dynamic_answers" JSONB,
    "status" "LeadStatus" NOT NULL DEFAULT 'SUBMITTED',
    "completeness_status" "CompletenessStatus" NOT NULL DEFAULT 'PENDING',
    "score" DOUBLE PRECISION,
    "score_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_qualifications" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "status" "QualificationStatus" NOT NULL,
    "missing_fields" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_attributions" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "landing_path" TEXT,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_events" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_scores" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "matched_rules" JSONB NOT NULL,
    "score_version" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "contact_phone" TEXT,
    "profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_development_seed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_services" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "event_types" TEXT[],

    CONSTRAINT "vendor_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_availability" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'UNKNOWN',
    "source" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_vendor_matches" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "reasons" TEXT[],
    "availability" "AvailabilityStatus" NOT NULL DEFAULT 'UNKNOWN',
    "matched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_vendor_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_executions" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "automation_type" TEXT NOT NULL,
    "execution_key" TEXT NOT NULL,
    "status" "AutomationStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_code" TEXT,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL DEFAULT 'SYSTEM',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "properties" JSONB,
    "lead_id" TEXT,
    "anonymous_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_types_slug_key" ON "event_types"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "questions_question_key_key" ON "questions"("question_key");

-- CreateIndex
CREATE INDEX "questions_event_type_id_idx" ON "questions"("event_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "leads_public_lead_id_key" ON "leads"("public_lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "leads_idempotency_key_key" ON "leads"("idempotency_key");

-- CreateIndex
CREATE INDEX "leads_public_lead_id_idx" ON "leads"("public_lead_id");

-- CreateIndex
CREATE INDEX "leads_event_type_id_idx" ON "leads"("event_type_id");

-- CreateIndex
CREATE INDEX "leads_city_idx" ON "leads"("city");

-- CreateIndex
CREATE INDEX "leads_event_date_idx" ON "leads"("event_date");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "lead_qualifications_lead_id_key" ON "lead_qualifications"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "lead_attributions_lead_id_key" ON "lead_attributions"("lead_id");

-- CreateIndex
CREATE INDEX "lead_events_lead_id_idx" ON "lead_events"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "lead_scores_lead_id_key" ON "lead_scores"("lead_id");

-- CreateIndex
CREATE INDEX "vendors_city_idx" ON "vendors"("city");

-- CreateIndex
CREATE INDEX "vendors_active_idx" ON "vendors"("active");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_services_vendor_id_service_id_key" ON "vendor_services"("vendor_id", "service_id");

-- CreateIndex
CREATE INDEX "vendor_availability_vendor_id_idx" ON "vendor_availability"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_availability_date_idx" ON "vendor_availability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_availability_vendor_id_date_key" ON "vendor_availability"("vendor_id", "date");

-- CreateIndex
CREATE INDEX "lead_vendor_matches_lead_id_idx" ON "lead_vendor_matches"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "lead_vendor_matches_lead_id_vendor_id_key" ON "lead_vendor_matches"("lead_id", "vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "automation_executions_execution_key_key" ON "automation_executions"("execution_key");

-- CreateIndex
CREATE INDEX "automation_executions_lead_id_idx" ON "automation_executions"("lead_id");

-- CreateIndex
CREATE INDEX "automation_executions_automation_type_idx" ON "automation_executions"("automation_type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "analytics_events_event_idx" ON "analytics_events"("event");

-- CreateIndex
CREATE INDEX "analytics_events_lead_id_idx" ON "analytics_events"("lead_id");

-- CreateIndex
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events"("created_at");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_qualifications" ADD CONSTRAINT "lead_qualifications_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_attributions" ADD CONSTRAINT "lead_attributions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_services" ADD CONSTRAINT "vendor_services_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_services" ADD CONSTRAINT "vendor_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_availability" ADD CONSTRAINT "vendor_availability_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_vendor_matches" ADD CONSTRAINT "lead_vendor_matches_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_vendor_matches" ADD CONSTRAINT "lead_vendor_matches_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_log_lead_fk" FOREIGN KEY ("entity_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
