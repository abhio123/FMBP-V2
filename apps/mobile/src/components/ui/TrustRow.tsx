import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "./Text";

export type TrustProps = {
  name: string;
  verified?: boolean;
  city?: string | null;
  category?: string | null;
  responseRate?: number | null;
  memberSince?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  completedDeals?: number | null;
  distanceKm?: number | null;
};

export function TrustRow(p: TrustProps) {
  const { t } = useTranslation();
  const bits: string[] = [];
  if (p.category) bits.push(p.category);
  if (p.city) bits.push(p.distanceKm != null ? `${p.city} · ${t("common.km", { km: Math.round(p.distanceKm) })}` : p.city);
  const trust: string[] = [];
  if (p.responseRate != null && p.responseRate > 0) trust.push(t("common.responseRate", { rate: Math.round(p.responseRate) }));
  if (p.ratingCount) trust.push(`★ ${p.ratingAvg?.toFixed(1)} (${p.ratingCount})`);
  if (p.completedDeals) trust.push(t("common.deals", { count: p.completedDeals }));
  if (p.memberSince) trust.push(t("common.memberSince", { date: new Date(p.memberSince).getFullYear() }));
  return (
    <View className="gap-0.5">
      <View className="flex-row items-center gap-1">
        <Text variant="label" numberOfLines={1} className="shrink">{p.name}</Text>
        {p.verified ? <Text className="text-success">✔︎</Text> : null}
      </View>
      {bits.length ? <Text variant="caption">{bits.join(" · ")}</Text> : null}
      {trust.length ? <Text variant="small">{trust.join(" · ")}</Text> : null}
    </View>
  );
}
