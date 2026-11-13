import { useState } from "react";
import { TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, Card, Button, EmptyState, Field } from "@/components/ui";
import { ShareActions } from "@/features/share/ShareActions";
import { applyReferralCode, getMyReferral, referralError } from "@/features/referral/api";
import { useSession } from "@/store/session";
import { track } from "@/lib/analytics";

/**
 * Invite businesses: my code, how the reward works (a Boost per business that joins and posts), my counts, and,
 * for a new business, a box for the code it was invited with.
 */
export default function Invite() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const business = useSession((s) => s.business);
  const me = useQuery({ queryKey: ["my_referral", business?.id], enabled: !!business, queryFn: () => getMyReferral(business!.id) });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const apply = async () => {
    setBusy(true); setMsg(null);
    try {
      await applyReferralCode(code);
      track("referral_code_applied");
      setMsg({ ok: true, text: t("referral.applied") }); setCode("");
      await qc.invalidateQueries({ queryKey: ["my_referral"] });
    } catch (e) {
      const r = referralError(e);
      setMsg({ ok: false, text: r ? t(`referral.errors.${r}`) : (e as Error).message });
    } finally { setBusy(false); }
  };

  if (!business) return null;
  if (me.isError) return <Screen><EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => me.refetch()} /></Screen>;
  const r = me.data;
  // WhatsApp shows *text* in bold; the message carries no link, so WhatsApp on iPhone keeps all of it
  const message = (whatsapp: boolean) => t("referral.shareMessage", { code: r ? (whatsapp ? `*${r.code}*` : r.code) : "" });
  return (
    <Screen>
      <Stack.Screen options={{ title: t("referral.invite") }} />
      {!r ? <Text variant="caption" className="py-4">{t("common.loading")}</Text> : (
        <View className="gap-4 py-4">
          <Card className="items-center bg-brand-light">
            <Text variant="caption">{t("referral.yourCode")}</Text>
            <Text selectable accessibilityLabel={r.code.split("").join(" ")} className="my-2 text-4xl font-bold tracking-widest text-brand-dark">{r.code}</Text>
            <View className="mt-1 flex-row flex-wrap justify-center gap-3">
              <ShareActions message={(whatsapp) => { track("invite_shared"); return message(whatsapp); }} />
            </View>
          </Card>
          <View className="flex-row gap-3">
            {[[t("referral.joined"), r.referral_count], [t("referral.waiting"), r.pending], [t("referral.boostsLeft"), r.boost_credits]].map(([label, n]) => (
              <Card key={String(label)} className="flex-1 items-center">
                <Text variant="title">{n}</Text>
                <Text variant="small" className="text-center">{label}</Text>
              </Card>
            ))}
          </View>
          {r.referral_count >= 5 ? <Text variant="label" className="text-center">{t("referral.badge")}</Text> : null}
          <Card>
            <Text variant="label" className="mb-2">{t("referral.howTitle")}</Text>
            {[1, 2, 3, 4, 5].map((n) => <Text key={n} variant="caption" className="mb-1">{n}. {t(`referral.how${n}`)}</Text>)}
          </Card>
          {r.referred_by ? <Text variant="caption" className="text-center">{t("referral.referredBy", { name: r.referred_by })}</Text> : null}
          {r.can_enter_code ? (
            <Card>
              <Field label={t("referral.haveCode")} showOptional={false}>
                <TextInput value={code} onChangeText={(s) => setCode(s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  placeholder={t("referral.codePlaceholder")} autoCapitalize="characters" autoCorrect={false}
                  className="min-h-[48px] rounded-xl border border-line px-4 text-[16px] tracking-widest text-ink" />
              </Field>
              <Button title={t("referral.apply")} variant="secondary" onPress={apply} loading={busy} disabled={code.length !== 6} />
            </Card>
          ) : null}
          {msg ? <Text variant="caption" className={msg.ok ? "text-center text-success" : "text-center text-danger"}>{msg.text}</Text> : null}
        </View>
      )}
    </Screen>
  );
}
