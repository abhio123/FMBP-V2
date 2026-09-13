/** Thin analytics facade. Swap the implementation for PostHog once EXPO_PUBLIC_POSTHOG_KEY is set. */
type Props = Record<string, string | number | boolean | undefined>;

export type AnalyticsEvent =
  | "login_otp_sent" | "login_success"
  | "business_created" | "profile_completed_item"
  | "post_type_selected" | "post_created" | "post_viewed" | "post_renewed"
  | "response_sent" | "message_sent"
  | "offering_created" | "search";

export function track(event: AnalyticsEvent, props: Props = {}) {
  if (__DEV__) console.log(`[analytics] ${event}`, props);
}
