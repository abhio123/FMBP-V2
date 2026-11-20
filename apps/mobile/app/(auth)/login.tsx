import { useState } from "react";
import { View, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Text, Button, Brand, Chip, IconText, ErrorText } from "@/components/ui";
import { sendOtp, sendEmailOtp, isValidIndianMobile, isValidEmail, normalizeEmail, authErrorKey } from "@/features/auth/api";
import { track } from "@/lib/analytics";
import { setLocale, LOCALES } from "@/i18n";
import { COLORS } from "@/theme";

export default function Login() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  // e-mail login is a stand-in until SMS works in India (DLT); phone stays the default
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const valid = mode === "phone" ? isValidIndianMobile(phone) : isValidEmail(email);
  const formatErr = mode === "phone" && phone.length === 10 && !valid ? t("auth.invalidPhone") : null;

  const switchMode = (m: "phone" | "email") => { setMode(m); setErr(null); };

  const submit = async () => {
    if (!valid) { setErr(t(mode === "phone" ? "auth.invalidPhone" : "auth.invalidEmail")); return; }
    setBusy(true); setErr(null);
    const e = mode === "phone" ? await sendOtp(phone) : await sendEmailOtp(email);
    setBusy(false);
    if (e) { setErr(t(authErrorKey(e))); return; }
    track("login_otp_sent", { channel: mode });
    router.push({ pathname: "/(auth)/otp", params: mode === "phone" ? { phone } : { email: normalizeEmail(email) } });
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
        <View className="flex-row gap-2" accessibilityRole="radiogroup">
          <Chip label={t("auth.usePhone")} selected={mode === "phone"} onPress={() => switchMode("phone")} />
          <Chip label={t("auth.useEmail")} selected={mode === "email"} onPress={() => switchMode("email")} />
        </View>
        <View className="gap-1">
          <Text variant="label">{t(mode === "phone" ? "auth.phone" : "auth.email")}</Text>
          <Text variant="caption">{t(mode === "phone" ? "auth.phoneHint" : "auth.emailHint")}</Text>
        </View>
        {mode === "email" ? (
          <TextInput
            accessibilityLabel={t("auth.email")}
            value={email}
            onChangeText={(s) => { setErr(null); setEmail(s.replace(/\s/g, "").slice(0, 254)); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            placeholder={t("auth.emailPlaceholder")}
            placeholderTextColor={COLORS.inkFaint}
            textAlignVertical="center"
            className={`h-14 rounded-xl border px-4 text-lg text-ink ${message ? "border-danger" : "border-line"}`}
            style={{ paddingVertical: 0, includeFontPadding: false }}
          />
        ) : (
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
        )}
        {message ? <ErrorText>{message}</ErrorText> : null}
        <Button title={t("auth.sendOtp")} onPress={submit} disabled={!valid} loading={busy} />
        <Text variant="small" className="text-center">{t("auth.terms")}</Text>
      </View>
    </Screen>
  );
}
