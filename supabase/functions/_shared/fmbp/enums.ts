import { z } from "zod";

export const Locale = z.enum(["en", "hi"]);
export type Locale = z.infer<typeof Locale>;

export const IntentionSlug = z.enum([
  "need", "offer", "sell", "buy", "partner", "announce", "learn", "teach", "invest", "raise",
]);
export type IntentionSlug = z.infer<typeof IntentionSlug>;

export const PostStatus = z.enum(["active", "paused", "completed", "expired", "archived"]);
export type PostStatus = z.infer<typeof PostStatus>;

export const OfferingStatus = z.enum(["active", "paused", "archived"]);
export type OfferingStatus = z.infer<typeof OfferingStatus>;

export const ResponseType = z.enum([
  "interested", "lets_talk", "call_me", "send_proposal", "apply",
  "collaborate", "offer_service", "invest", "partner", "chat",
]);
export type ResponseType = z.infer<typeof ResponseType>;

export const VerificationStatus = z.enum(["none", "pending", "verified", "rejected"]);
export type VerificationStatus = z.infer<typeof VerificationStatus>;

export const VerificationDocType = z.enum(["gst", "udyam", "fssai", "trade_license", "iec", "other"]);
export type VerificationDocType = z.infer<typeof VerificationDocType>;

export const DealStatus = z.enum(["proposed", "confirmed", "completed", "cancelled"]);
export type DealStatus = z.infer<typeof DealStatus>;

export const MediaKind = z.enum(["photo", "video", "brochure", "catalogue"]);
export type MediaKind = z.infer<typeof MediaKind>;

export const FeedTab = z.enum(["recommended", "latest", "trending", "nearby", "category", "following", "saved"]);
export type FeedTab = z.infer<typeof FeedTab>;

export const FeedFilters = z.object({
  pincode: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  verified_only: z.boolean().optional(),
  budget_min: z.number().optional(),
  budget_max: z.number().optional(),
  category_id: z.string().uuid().optional(),
  post_type_slug: z.string().optional(),
  radius_km: z.number().optional(),
});
export type FeedFilters = z.infer<typeof FeedFilters>;
