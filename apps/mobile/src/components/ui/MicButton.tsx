import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { COLORS } from "@/theme";
import { speechAvailable, speechLang, speechModule } from "@/lib/speech";
import { Icon } from "./Icon";

type Subscription = { remove: () => void };

/**
 * Speak instead of typing (for people who find typing hard): tap the mic, speak, and the words are written into the
 * box, in the app's language (Hindi or English). Tap again to stop; it also stops by itself after a pause. Asks for the
 * microphone once. Not shown where speech cannot work (Expo Go, a phone without a recogniser).
 */
export function MicButton({ onText, size = 40 }: { onText: (text: string) => void; size?: number }) {
  const { t, i18n } = useTranslation();
  const [listening, setListening] = useState(false);
  const subs = useRef<Subscription[]>([]);
  const onTextRef = useRef(onText);
  useEffect(() => { onTextRef.current = onText; }, [onText]);
  const [available] = useState(speechAvailable);

  const unsubscribe = () => { subs.current.forEach((s) => s.remove()); subs.current = []; };
  // leaving the screen while listening: stop the microphone
  useEffect(() => () => {
    if (subs.current.length) { unsubscribe(); try { speechModule()?.abort(); } catch { /* already stopped */ } }
  }, []);
  if (!available) return null;

  const start = async () => {
    const m = speechModule();
    if (!m) return;
    const perm = await m.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("voice.permissionTitle"), t("voice.permissionBody"), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("voice.openSettings"), onPress: () => { void Linking.openSettings(); } },
      ]);
      return;
    }
    unsubscribe();
    // only the mic that was tapped listens (several boxes on one screen share one recogniser)
    subs.current = [
      m.addListener("result", (e) => { if (e.isFinal) onTextRef.current(e.results[0]?.transcript ?? ""); }),
      m.addListener("end", () => { unsubscribe(); setListening(false); }),
      m.addListener("error", (e) => {
        unsubscribe(); setListening(false);
        if (e.error === "aborted") return;
        Alert.alert(e.error === "no-speech" || e.error === "speech-timeout" ? t("voice.noSpeech") : t("voice.error"));
      }),
    ];
    setListening(true);
    m.start({ lang: speechLang(i18n.language), interimResults: false, continuous: false, addsPunctuation: true });
  };
  const stop = () => { try { speechModule()?.stop(); } catch { /* already stopped */ } };

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ busy: listening }}
      accessibilityLabel={listening ? t("voice.stop") : t("voice.speak")} hitSlop={6}
      onPress={() => (listening ? stop() : void start())}
      style={[styles.button, { width: size, height: size, borderRadius: size / 2 }, listening && styles.listening]}>
      <Icon name={listening ? "stop" : "mic"} size={Math.round(size * 0.5)} color={listening ? COLORS.white : COLORS.brand} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", justifyContent: "center", backgroundColor: COLORS.brandLight },
  listening: { backgroundColor: COLORS.danger },
});
