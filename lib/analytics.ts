import posthog from "posthog-js";

/**
 * Fire a custom PostHog event. No-op on the server, or when analytics isn't
 * configured (no NEXT_PUBLIC_POSTHOG_KEY) — so call sites stay decoupled and
 * never crash when PostHog is absent.
 */
export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // analytics must never break the UX
  }
}
