import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { COLORS } from "@/theme";
import { appendSpoken, speechAvailable, speechLang, speechModule } from "@/lib/speech";
import { Icon } from "./Icon";

type Subscription = { remove: () => void };

/**
 * What the person says goes into a text, live: the words appear while they speak and are corrected as the recogniser
 * understands more (each partial result replaces only the spoken part), then the final words stay. What was already
 * written before the mic was tapped is kept in front. Never beyond `max`; `apply` gets whether something was cut.
 * Typing while it listens stops the mic (`typed`), so spoken words never overwrite what was typed.
 */
export function useSpokenInto(value: string, apply: (text: string, cut: boolean) => void, max: number) {
  const base = useRef(value); // what was written when listening started
  const current = useRef(value);
  const listening = useRef(false);
  useEffect(() => { current.current = value; }, [value]);
  return {
    onStart: () => { base.current = current.current; listening.current = true; },
    onEnd: () => { listening.current = false; },
    /** call when the person types: the mic stops and late words are dropped */
    typed: () => {
      if (!listening.current) return;
      listening.current = false;
      try { speechModule()?.abort(); } catch { /* already stopped */ }
    },
    onSpeech: (spoken: string, final: boolean) => {
      if (!listening.current) return; // typed meanwhile, or a late result after stopping
      const joined = appendSpoken(base.current, spoken, max);
      apply(joined.text, joined.cut);
      if (final) base.current = joined.text; // a next sentence goes after this one
    },
  };
}

/**
 * Speak instead of typing (for people who find typing hard): tap the mic, speak, and the words are written into the
 * box while speaking, in the app's language (Hindi or English). Tap again to stop; it also stops by itself after a
 * pause. Asks for the microphone once. Not shown where speech cannot work (Expo Go, a phone without a recogniser).
 */
export function MicButton({ onStart, onEnd, onSpeech, size = 40 }: {
  /** listening starts: remember what is already written */
  onStart?: () => void;
  /** listening stopped (finished, stopped, cancelled or failed) */
  onEnd?: () => void;
  /** the words so far (`final` false while speaking, true when the recogniser is sure) */
  onSpeech: (text: string, final: boolean) => void;
  size?: number;
}) {
  const { t, i18n } = useTranslation();
  const [listening, setListening] = useState(false);
  const subs = useRef<Subscription[]>([]);
  const onSpeechRef = useRef(onSpeech);
  const onEndRef = useRef(onEnd);
  useEffect(() => { onSpeechRef.current = onSpeech; onEndRef.current = onEnd; }, [onSpeech, onEnd]);
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
      // partial results while speaking (shown live), then the final one
      m.addListener("result", (e) => onSpeechRef.current(e.results[0]?.transcript ?? "", e.isFinal)),
      m.addListener("end", () => { unsubscribe(); setListening(false); onEndRef.current?.(); }),
      m.addListener("error", (e) => {
        unsubscribe(); setListening(false); onEndRef.current?.();
        if (e.error === "aborted") return;
        Alert.alert(e.error === "no-speech" || e.error === "speech-timeout" ? t("voice.noSpeech") : t("voice.error"));
      }),
    ];
    onStart?.();
    setListening(true);
    m.start({ lang: speechLang(i18n.language), interimResults: true, continuous: false, addsPunctuation: true });
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
