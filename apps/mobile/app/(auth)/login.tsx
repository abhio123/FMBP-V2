import { useState } from "react";
import { View, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Text, Button } from "@/components/ui";
import { sendOtp, isValidIndianMobile, authErrorKey } from "@/features/auth/api";
import { track } from "@/lib/analytics";

export default function Login() {
  const { t } = useTranslation();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const valid = isValidIndianMobile(phone);
  // Show the format error as soon as the user has typed a full number that can't be an Indian mobile.
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
      <View className="flex-1 justify-center gap-6 py-10">
        <View className="gap-2">
          <Text className="text-4xl">🤝</Text>
          <Text variant="title">{t("auth.title")}</Text>
          <Text variant="subtitle">{t("auth.subtitle")}</Text>
        </View>
        <View className={`flex-row items-center rounded-xl border px-4 ${message ? "border-danger" : "border-line"}`}>
          <Text className="text-lg">+91</Text>
          <TextInput
            accessibilityLabel={t("auth.phone")}
            value={phone}
            onChangeText={(s) => { setErr(null); setPhone(s.replace(/[^0-9]/g, "").slice(0, 10)); }}
            keyboardType="phone-pad"
            autoFocus
            placeholder="98765 43210"
            className="ml-3 min-h-[52px] flex-1 text-lg text-ink"
          />
        </View>
        {message ? <Text variant="caption" className="text-danger">{message}</Text> : null}
        <Button title={t("auth.sendOtp")} onPress={submit} disabled={!valid} loading={busy} />
        <Text variant="small" className="text-center">{t("auth.terms")}</Text>
      </View>
    </Screen>
  );
}
