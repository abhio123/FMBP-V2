import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatDate, TEXT_LIMITS } from "@fmbp/shared";
import { Avatar, Button, Card, EmptyState, Screen, Text, DataIcon, Icon, ICON_COLOR, TextBox } from "@/components/ui";
import { dealError, dealsToDo, listMyDeals, rateDeal, respondToDeal, type MyDeal } from "@/features/deals/api";
import { useSession } from "@/store/session";

/**
 * My deals (Business → My deals, and the push "Did you do a deal?"): confirm deals other businesses named me in
 * (one tap), rate confirmed deals (1–5★, optional words), and see what is waiting or done.
 */
export default function MyDeals() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const qc = useQueryClient();
  const business = useSession((s) => s.business);
  const deals = useQuery({ queryKey: ["my_deals", business?.id], enabled: !!business, queryFn: () => listMyDeals(business!.id) });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id); setErr(null);
    try { await fn(); await Promise.all([qc.invalidateQueries({ queryKey: ["my_deals"] }), qc.invalidateQueries({ queryKey: ["business"] })]); }
    catch (e) { const code = dealError(e); setErr(code ? t(`deals.errors.${code}`) : (e as Error).message); }
    finally { setBusyId(null); }
  };

  if (!business) return null;
  if (deals.isError) return <Screen><EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => deals.refetch()} /></Screen>;
  const all = deals.data ?? [];
  const { toConfirm, toRate } = dealsToDo(all);
  const waiting = all.filter((d) => d.status === "proposed" && d.i_am_owner);
  const done = all.filter((d) => d.status === "completed");
  const head = (d: MyDeal) => (
    <View className="flex-row items-center gap-3">
      <Avatar name={d.other_name} uri={d.other_logo} size={40} />
      <View className="flex-1">
        <Text variant="label">{d.other_name}</Text>
        {d.post_title ? <View className="flex-row items-center gap-1.5"><DataIcon value={d.post_icon} fallback="pin-outline" size={16} color={ICON_COLOR.muted} /><Text variant="caption" numberOfLines={1} className="shrink">{d.post_title}</Text></View> : null}
      </View>
    </View>
  );
  return (
    <Screen>
      <Stack.Screen options={{ title: t("deals.myDeals") }} />
      <View className="gap-4 py-4">
        {deals.isLoading ? <Text variant="caption">{t("common.loading")}</Text> : null}
        {err ? <Text variant="caption" className="text-danger">{err}</Text> : null}

        {toConfirm.length ? <Text variant="heading" accessibilityRole="header">{t("deals.toConfirm")}</Text> : null}
        {toConfirm.map((d) => (
          <Card key={d.id} className="border-brand">
            {head(d)}
            <Text className="mt-2">{t("deals.toConfirmItem", { name: d.other_name, title: d.post_title ?? "" })}</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              <Button title={t("deals.confirm")} icon="checkmark" full={false} loading={busyId === d.id} onPress={() => act(d.id, () => respondToDeal(d.id, true))} />
              <Button title={t("deals.notWithUs")} variant="ghost" full={false} disabled={busyId === d.id} onPress={() => act(d.id, () => respondToDeal(d.id, false))} />
            </View>
          </Card>
        ))}

        {toRate.length ? <Text variant="heading" accessibilityRole="header">{t("deals.toRate")}</Text> : null}
        {toRate.map((d) => <RateCard key={d.id} deal={d} busy={busyId === d.id} onRate={(stars, words) => act(d.id, () => rateDeal(d.id, stars, words))} header={head(d)} />)}

        {waiting.length ? <Text variant="heading" accessibilityRole="header">{t("deals.waitingTitle")}</Text> : null}
        {waiting.map((d) => (
          <Card key={d.id}>{head(d)}<Text variant="caption" className="mt-2">{t("deals.waiting", { name: d.other_name })}</Text></Card>
        ))}

        <Text variant="heading" accessibilityRole="header">{t("deals.done")}</Text>
        {done.length ? done.map((d) => (
          <Card key={d.id}>
            {head(d)}
            <Text variant="small" className="mt-2">{d.completed_at ? formatDate(d.completed_at, lang) : ""}</Text>
            {d.my_rating ? <Text variant="caption">{t("deals.rated", { stars: "★".repeat(d.my_rating) })}</Text> : null}
            {d.their_rating ? <Text variant="caption">{t("deals.theirRating", { stars: "★".repeat(d.their_rating) })}</Text>
              : d.my_rating ? <Text variant="small">{t("deals.ratingHidden")}</Text> : null}
            {!d.counted ? <Text variant="small">{t("deals.notCounted")}</Text> : null}
          </Card>
        )) : !deals.isLoading ? <Text variant="caption">{t("deals.noDeals")}</Text> : null}
      </View>
    </Screen>
  );
}

/** 1–5 stars (big tap targets) and an optional line, then Send. */
function RateCard({ deal, busy, onRate, header }: { deal: MyDeal; busy: boolean; onRate: (stars: number, words: string) => void; header: ReactNode }) {
  const { t } = useTranslation();
  const [stars, setStars] = useState(0);
  const [words, setWords] = useState("");
  return (
    <Card>
      {header}
      <Text className="mt-2">{t("deals.rateItem", { name: deal.other_name })}</Text>
      <View accessibilityRole="radiogroup" className="mt-2 flex-row gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} accessibilityRole="radio" accessibilityState={{ selected: stars === n }} accessibilityLabel={t("deals.starsA11y", { n })}
            onPress={() => setStars(n)} hitSlop={4} className="min-h-[44px] min-w-[44px] items-center justify-center">
            <Icon name={n <= stars ? "star" : "star-outline"} size={32} color={n <= stars ? ICON_COLOR.accent : ICON_COLOR.faint} />
          </Pressable>
        ))}
      </View>
      <View className="mt-2"><TextBox multiline value={words} onChangeText={setWords} maxLength={TEXT_LIMITS.reviewText} placeholder={t("deals.ratePlaceholder")} /></View>
      <View className="mt-3 flex-row">
        <Button title={t("deals.submitRating")} full={false} disabled={!stars} loading={busy} onPress={() => onRate(stars, words)} />
      </View>
    </Card>
  );
}
