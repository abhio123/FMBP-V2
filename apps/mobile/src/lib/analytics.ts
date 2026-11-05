/** Thin analytics facade. Swap the implementation for PostHog once EXPO_PUBLIC_POSTHOG_KEY is set. */
type Props = Record<string, string | number | boolean | undefined>;

export type AnalyticsEvent =
  | "login_otp_sent" | "login_success"
  | "business_created" | "profile_completed_item"
  | "post_type_selected" | "post_created" | "post_edited" | "post_viewed" | "post_renewed"
  | "response_sent" | "message_sent"
  | "offering_created" | "search"
  | "post_reported" | "business_reported" | "business_blocked" | "account_deletion_requested" | "account_restored"
  | "referral_code_applied" | "invite_shared" | "post_boosted"
  | "admin_mode_chosen" | "admin_action" | "verification_requested";

export function track(event: AnalyticsEvent, props: Props = {}) {
  if (__DEV__) console.log(`[analytics] ${event}`, props);
}
