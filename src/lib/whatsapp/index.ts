/**
 * MuggedMoments — WhatsApp Adapter Boundary
 *
 * DO NOT build a fake WhatsApp integration.
 * DO NOT claim WhatsApp has been integrated if credentials are absent.
 *
 * This creates the adapter boundary so a real provider can be connected
 * when credentials/configuration are available.
 *
 * Development: MockWhatsAppProvider (logs only, no network calls)
 * Production: RealWhatsAppProvider (REQUIRES_EXTERNAL_CREDENTIALS)
 */

export interface WhatsAppMessage {
  to: string; // E.164 format phone number
  body: string;
}

export interface WhatsAppHandoffResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppProvider {
  sendMessage(message: WhatsAppMessage): Promise<WhatsAppHandoffResult>;
  createHandoff(phoneNumber: string, context: Record<string, unknown>): Promise<WhatsAppHandoffResult>;
}

/**
 * MockWhatsAppProvider — development only.
 * Logs all calls. Makes no external network requests.
 * Status: MOCK — not connected to any real WhatsApp service.
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppHandoffResult> {
    console.log(
      "[WHATSAPP:MOCK] sendMessage",
      JSON.stringify({ to: message.to.slice(-4).padStart(message.to.length, "*"), body: "[redacted]" })
    );
    return { success: true, messageId: `mock-${Date.now()}` };
  }

  async createHandoff(
    phoneNumber: string,
    context: Record<string, unknown>
  ): Promise<WhatsAppHandoffResult> {
    console.log(
      "[WHATSAPP:MOCK] createHandoff",
      JSON.stringify({ phoneNumber: phoneNumber.slice(-4).padStart(phoneNumber.length, "*"), context })
    );
    return { success: true, messageId: `mock-handoff-${Date.now()}` };
  }
}

/**
 * REQUIRES_EXTERNAL_CREDENTIALS — placeholder for real provider.
 * Implement when WHATSAPP_API_KEY and WHATSAPP_PHONE_NUMBER_ID are available.
 */
export class UnconfiguredWhatsAppProvider implements WhatsAppProvider {
  async sendMessage(_message: WhatsAppMessage): Promise<WhatsAppHandoffResult> {
    console.error(
      "[WHATSAPP] sendMessage called but no real provider is configured. " +
        "REQUIRES_EXTERNAL_CREDENTIALS: WHATSAPP_API_KEY, WHATSAPP_PHONE_NUMBER_ID"
    );
    return { success: false, error: "WhatsApp provider not configured." };
  }

  async createHandoff(
    _phoneNumber: string,
    _context: Record<string, unknown>
  ): Promise<WhatsAppHandoffResult> {
    console.error(
      "[WHATSAPP] createHandoff called but no real provider is configured. " +
        "REQUIRES_EXTERNAL_CREDENTIALS: WHATSAPP_API_KEY, WHATSAPP_PHONE_NUMBER_ID"
    );
    return { success: false, error: "WhatsApp provider not configured." };
  }
}

function createWhatsAppProvider(): WhatsAppProvider {
  const hasApiKey = Boolean(process.env.WHATSAPP_API_KEY);
  const hasPhoneId = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID);

  if (process.env.NODE_ENV === "development" || process.env.WHATSAPP_PROVIDER === "mock") {
    return new MockWhatsAppProvider();
  }

  if (!hasApiKey || !hasPhoneId) {
    console.warn(
      "[WHATSAPP] Real provider requested but credentials are missing. " +
        "Falling back to UnconfiguredWhatsAppProvider. " +
        "Set WHATSAPP_API_KEY and WHATSAPP_PHONE_NUMBER_ID to enable."
    );
    return new UnconfiguredWhatsAppProvider();
  }

  // REQUIRES_EXTERNAL_CREDENTIALS — implement real provider here
  return new UnconfiguredWhatsAppProvider();
}

export const whatsApp: WhatsAppProvider = createWhatsAppProvider();
