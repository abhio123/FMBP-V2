import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { isTrusted, tradeLabel } from "@fmbp/shared";
import { Text } from "./Text";
import { Icon, ICON_COLOR } from "./Icon";
import { Highlight } from "./Highlight";
import { Avatar } from "./Avatar";

export type TrustProps = {
  name: string;
  verified?: boolean;
  city?: string | null;
  category?: string | null;
  responseRate?: number | null;
  /** How many responses (last 90 days) the rate is based on; the rate is hidden below MIN_RESPONSE_SAMPLE. */
  responseSample?: number | null;
  memberSince?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  completedDeals?: number | null;
  distanceKm?: number | null;
  /** Search terms to highlight in the name and category/city line (search results only). */
  highlight?: string[];
  /** Show the business picture (logo, else initials) before the name, as on post cards and in lists. */
  avatar?: boolean;
  logoUrl?: string | null;
  /** Businesses that joined through this business's invite code; 5+ shows the Community builder badge. */
  referralCount?: number | null;
  /** Business page / My Business header: the name as the page's main heading. */
  large?: boolean;
  /** "business" or "individual": a shop or person icon before the category / trade line; an individual shows their trade instead of the category. */
  kind?: string | null;
  trade?: string | null;
  tradeOther?: string | null;
};

/** A rate from 1–2 enquiries ("100%") would mislead; show it once it rests on a few. */
const MIN_RESPONSE_SAMPLE = 3;
/** Same threshold as features/referral (kept here so the UI kit does not import a feature). */
const COMMUNITY_BUILDER_AT = 5;

export function TrustRow(p: TrustProps) {
  const { t, i18n } = useTranslation();
  const individual = p.kind === "individual";
  const bits: string[] = [];
  const what = individual ? tradeLabel(p.trade, p.tradeOther, i18n.language === "hi" ? "hi" : "en") : p.category;
  if (what) bits.push(what);
  if (p.city) bits.push(p.distanceKm != null ? `${p.city} · ${t("common.km", { km: Math.round(p.distanceKm) })}` : p.city);
  const trust: string[] = [];
  // 3+ deals confirmed by both sides and no average below 4★ (same rule as the ranking in the database)
  if (isTrusted({ completed_deals: p.completedDeals, rating_avg: p.ratingAvg, rating_count: p.ratingCount })) trust.push(t("deals.trusted"));
  if (p.responseRate != null && p.responseRate > 0 && (p.responseSample ?? 0) >= MIN_RESPONSE_SAMPLE) trust.push(t("common.responseRate", { rate: Math.round(p.responseRate) }));
  if (p.ratingCount) trust.push(t("common.rating", { avg: p.ratingAvg?.toFixed(1), count: p.ratingCount }));
  if (p.completedDeals) trust.push(t("common.deals", { count: p.completedDeals }));
  if ((p.referralCount ?? 0) >= COMMUNITY_BUILDER_AT) trust.push(t("referral.badge"));
  if (p.memberSince) trust.push(t("common.memberSince", { date: new Date(p.memberSince).getFullYear() }));
  const details = (
    <View className="gap-0.5">
      <View className="flex-row items-center gap-1">
        <Highlight variant={p.large ? "heading" : "label"} numberOfLines={p.large ? 2 : 1} className="shrink" text={p.name} terms={p.highlight} />
        {p.verified ? <View accessible accessibilityLabel={t("common.verified")}><Icon name="shield-checkmark" size={p.large ? 20 : 16} color={ICON_COLOR.success} /></View> : null}
      </View>
      {bits.length ? (
        // who is posting, as a picture before "Food & Restaurant · Noida" / "Cook · Noida": the shop or person of the
        // Business / Me tab (shown wherever the profile type is known)
        <View className="flex-row items-center gap-1">
          {p.kind ? (
            <View accessible accessibilityLabel={individual ? t("individual.badge") : t("individual.businessBadge")}>
              <Icon name={individual ? "person-outline" : "storefront-outline"} size={p.large ? 16 : 14} color={ICON_COLOR.muted} />
            </View>
          ) : null}
          <Highlight variant="caption" className="shrink" text={bits.join(" · ")} terms={p.highlight} />
        </View>
      ) : null}
      {trust.length ? <Text variant="small">{trust.join(" · ")}</Text> : null}
    </View>
  );
  if (!p.avatar) return details;
  return (
    <View className="flex-row items-center gap-3">
      <Avatar name={p.name} uri={p.logoUrl} size={44} />
      <View className="flex-1">{details}</View>
    </View>
  );
}
