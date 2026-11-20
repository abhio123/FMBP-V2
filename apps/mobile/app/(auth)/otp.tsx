import { useEffect, useState } from "react";
import { View, TextInput } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Text, Button, ErrorText } from "@/components/ui";
import { verifyOtp, sendOtp, verifyEmailOtp, sendEmailOtp, isValidIndianMobile, isValidEmail, authErrorKey } from "@/features/auth/api";
import { track } from "@/lib/analytics";

/** Seconds before "Resend code" works again. Each SMS costs money and the server refuses quicker repeats anyway. */
const RESEND_COOLDOWN_S = 30;

export default function Otp() {
  const { t } = useTranslation();
  const router = useRouter();
  // either a phone (10 digits) or an e-mail address, set by the login screen
  const { phone, email } = useLocalSearchParams<{ phone?: string; email?: string }>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // the login screen has just sent a code, so the countdown starts at once
  const [wait, setWait] = useState(RESEND_COOLDOWN_S);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  // Validated on the login screen; never let an invalid number or address reach verification.
  const byEmail = !phone && !!email;
  if (byEmail ? !isValidEmail(email!) : !phone || !isValidIndianMobile(phone)) return <Redirect href="/(auth)/login" />;

  const submit = async (value = code) => {
    if (value.length !== 6) { setErr(t("auth.invalidOtp")); return; }
    setBusy(true); setErr(null); setInfo(null);
    const e = byEmail ? await verifyEmailOtp(email!, value) : await verifyOtp(phone!, value);
    setBusy(false);
    if (e) { setErr(t(authErrorKey(e))); return; }
    track("login_success", { channel: byEmail ? "email" : "phone" });
    // AuthGate in the root layout routes to onboarding or feed.
  };

  const resend = async () => {
    if (wait > 0 || resending) return;
    setErr(null); setInfo(null); setResending(true);
    const e = byEmail ? await sendEmailOtp(email!) : await sendOtp(phone!);
    setResending(false);
    // wait again either way: after a failure (e.g. too many requests) an instant retry would fail the same way
    setWait(RESEND_COOLDOWN_S);
    if (e) { setErr(t(authErrorKey(e))); return; }
    setInfo(t("auth.resent"));
  };

  return (
    <Screen>
      <View className="flex-grow justify-center gap-6 py-10">
        <View className="gap-2">
          <Text variant="title">{t("auth.otpTitle")}</Text>
          <Text variant="subtitle">{byEmail ? t("auth.otpSentEmail", { email }) : t("auth.otpSent", { phone })}</Text>
        </View>
        <TextInput
          accessibilityLabel={t("auth.otpTitle")}
          value={code}
          onChangeText={(s) => {
            const next = s.replace(/[^0-9]/g, "").slice(0, 6);
            setErr(null); setCode(next);
            // the code suggested above the keyboard (or pasted) arrives whole: check it at once, no extra tap
            if (next.length === 6 && code.length < 6 && !busy) void submit(next);
          }}
          keyboardType="number-pad"
          autoFocus
          // the phone offers the code from the SMS above the keyboard: iPhone (oneTimeCode) and Android (sms-otp)
          textContentType="oneTimeCode"
          autoComplete={byEmail ? undefined : "sms-otp"}
          importantForAutofill="yes"
          placeholder="••••••"
          className={`min-h-[56px] rounded-xl border px-4 text-center text-2xl tracking-[8px] text-ink ${err ? "border-danger" : "border-line"}`}
        />
        {err ? <ErrorText>{err}</ErrorText> : null}
        {info ? <Text variant="caption" className="text-brand">{info}</Text> : null}
        <Button title={t("auth.verify")} onPress={() => submit()} disabled={code.length !== 6} loading={busy} />
        <Button
          title={wait > 0 ? t("auth.resendIn", { seconds: wait }) : t("auth.resend")}
          variant="ghost"
          onPress={resend}
          disabled={wait > 0}
          loading={resending}
        />
        <Button title={t(byEmail ? "auth.changeEmail" : "auth.changeNumber")} variant="ghost" onPress={() => router.replace("/(auth)/login")} />
      </View>
    </Screen>
  );
}
