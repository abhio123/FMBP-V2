import { useState } from "react";
import { View, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Text, Button, Brand, Chip, IconText } from "@/components/ui";
import { sendOtp, isValidIndianMobile, authErrorKey } from "@/features/auth/api";
import { track } from "@/lib/analytics";
import { setLocale, LOCALES } from "@/i18n";
import { COLORS } from "@/theme";

export default function Login() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const valid = isValidIndianMobile(phone);
  const formatErr = phone.length === 10 && !valid ? t("auth.invalidPhone") : null;

  const submit = async () => {
    if (!valid) { setErr(t("auth.invalidPhone")); return; }
    setBusy(true); setErr(null);
    const e = await sendOtp(phone);
    setBusy(false);
    if (e) { setErr(t(authErrorKey(e))); return; }
    track("login_otp_sent");
    router.push({ pathname: "/(auth)/otp", params: { phone } });
  };

  const message = formatErr ?? err;

  return (
    <Screen>
      <View className="flex-grow justify-center gap-6 py-8">
        <View className="flex-row justify-end gap-2">
          {LOCALES.map((l) => <Chip key={l} label={t(`common.languages.${l}`)} selected={i18n.language === l} onPress={() => setLocale(l)} />)}
        </View>
        <Brand size="lg" />
        <View className="gap-2 rounded-2xl bg-brand-light p-4">
          <Text variant="label" className="text-brand-dark">{t("auth.title")}</Text>
          <IconText icon="hand-right-outline" variant="caption">{t("app.pillars.need")}</IconText>
          <IconText icon="people-circle-outline" variant="caption">{t("app.pillars.offer")}</IconText>
          <IconText icon="location-outline" variant="caption">{t("app.pillars.nearby")}</IconText>
        </View>
        <View className="gap-1">
          <Text variant="label">{t("auth.phone")}</Text>
          <Text variant="caption">{t("auth.phoneHint")}</Text>
        </View>
        <View className={`h-14 flex-row items-center rounded-xl border pl-4 ${message ? "border-danger" : "border-line"}`}>
          <Text className="text-lg leading-6 text-ink">+91</Text>
          <View className="mx-3 h-6 w-px bg-line" />
          <TextInput
            accessibilityLabel={t("auth.phone")}
            value={phone}
            onChangeText={(s) => { setErr(null); setPhone(s.replace(/[^0-9]/g, "").slice(0, 10)); }}
            keyboardType="phone-pad"
            placeholder="98765 43210"
            placeholderTextColor={COLORS.inkFaint}
            textAlignVertical="center"
            className="h-14 flex-1 pr-4 text-lg text-ink"
            style={{ paddingVertical: 0, includeFontPadding: false }}
          />
        </View>
        {message ? <Text variant="caption" className="text-danger">{message}</Text> : null}
        <Button title={t("auth.sendOtp")} onPress={submit} disabled={!valid} loading={busy} />
        <Text variant="small" className="text-center">{t("auth.terms")}</Text>
      </View>
    </Screen>
  );
}
