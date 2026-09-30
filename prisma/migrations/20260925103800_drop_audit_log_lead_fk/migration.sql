-- Drop the audit_logs -> leads foreign key.
-- audit_logs.entity_id is a polymorphic reference (Lead, Vendor, VendorOtpCode, etc.,
-- per entity_type) and was incorrectly constrained to leads.id only. This silently
-- broke every non-Lead createAuditLog() call (write caught and logged, never thrown).
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_log_lead_fk";
