import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "./Text";
import { Highlight } from "./Highlight";

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
};

/** A rate from 1–2 enquiries ("100%") would mislead; show it once it rests on a few. */
const MIN_RESPONSE_SAMPLE = 3;

export function TrustRow(p: TrustProps) {
  const { t } = useTranslation();
  const bits: string[] = [];
  if (p.category) bits.push(p.category);
  if (p.city) bits.push(p.distanceKm != null ? `${p.city} · ${t("common.km", { km: Math.round(p.distanceKm) })}` : p.city);
  const trust: string[] = [];
  if (p.responseRate != null && p.responseRate > 0 && (p.responseSample ?? 0) >= MIN_RESPONSE_SAMPLE) trust.push(t("common.responseRate", { rate: Math.round(p.responseRate) }));
  if (p.ratingCount) trust.push(`★ ${p.ratingAvg?.toFixed(1)} (${p.ratingCount})`);
  if (p.completedDeals) trust.push(t("common.deals", { count: p.completedDeals }));
  if (p.memberSince) trust.push(t("common.memberSince", { date: new Date(p.memberSince).getFullYear() }));
  return (
    <View className="gap-0.5">
      <View className="flex-row items-center gap-1">
        <Highlight variant="label" numberOfLines={1} className="shrink" text={p.name} terms={p.highlight} />
        {p.verified ? <Text className="text-success">✔︎</Text> : null}
      </View>
      {bits.length ? <Highlight variant="caption" text={bits.join(" · ")} terms={p.highlight} /> : null}
      {trust.length ? <Text variant="small">{trust.join(" · ")}</Text> : null}
    </View>
  );
}
