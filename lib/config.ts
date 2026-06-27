// Centralized runtime config. Read env once here so components/pages don't
// reach into process.env directly.

/**
 * Where every "Book a demo" CTA points. Set BOOKING_URL (Cal.com / Calendly)
 * in the environment; falls back to a placeholder so the UI never renders a
 * dead link in development.
 */
export const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL ?? "https://cal.com/lead/demo";

/** Claude model used by the audit. Overridable via AGENT_MODEL. */
export const AGENT_MODEL = process.env.AGENT_MODEL ?? "claude-opus-4-8";
