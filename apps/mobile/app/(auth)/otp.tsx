import { useState } from "react";
import { View, TextInput } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Text, Button } from "@/components/ui";
import { verifyOtp, sendOtp, isValidIndianMobile, authErrorKey } from "@/features/auth/api";
import { track } from "@/lib/analytics";

export default function Otp() {
  const { t } = useTranslation();
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // The number is validated on the login screen; never let an invalid one reach verification.
  if (!phone || !isValidIndianMobile(phone)) return <Redirect href="/(auth)/login" />;

  const submit = async () => {
    if (code.length !== 6) { setErr(t("auth.invalidOtp")); return; }
    setBusy(true); setErr(null); setInfo(null);
    const e = await verifyOtp(phone, code);
    setBusy(false);
    if (e) { setErr(t(authErrorKey(e))); return; }
    track("login_success");
    // AuthGate in the root layout routes to onboarding or feed.
  };

  const resend = async () => {
    setErr(null); setInfo(null);
    const e = await sendOtp(phone);
    if (e) { setErr(t(authErrorKey(e))); return; }
    setInfo(t("auth.resent"));
  };

  return (
    <Screen>
      <View className="flex-1 justify-center gap-6 py-10">
        <View className="gap-2">
          <Text variant="title">{t("auth.otpTitle")}</Text>
          <Text variant="subtitle">{t("auth.otpSent", { phone })}</Text>
        </View>
        <TextInput
          accessibilityLabel={t("auth.otpTitle")}
          value={code}
          onChangeText={(s) => { setErr(null); setCode(s.replace(/[^0-9]/g, "").slice(0, 6)); }}
          keyboardType="number-pad"
          autoFocus
          textContentType="oneTimeCode"
          placeholder="••••••"
          className={`min-h-[56px] rounded-xl border px-4 text-center text-2xl tracking-[8px] text-ink ${err ? "border-danger" : "border-line"}`}
        />
        {err ? <Text variant="caption" className="text-danger">{err}</Text> : null}
        {info ? <Text variant="caption" className="text-brand">{info}</Text> : null}
        <Button title={t("auth.verify")} onPress={submit} disabled={code.length !== 6} loading={busy} />
        <Button title={t("auth.resend")} variant="ghost" onPress={resend} />
        <Button title={t("auth.changeNumber")} variant="ghost" onPress={() => router.replace("/(auth)/login")} />
      </View>
    </Screen>
  );
}
