import { requireOptionalNativeModule } from "expo";

/**
 * Speaking instead of typing (expo-speech-recognition). The package is native: it is in the app builds, not in Expo
 * Go. We first ask Expo whether its native part is there (requireOptionalNativeModule returns null instead of
 * throwing), and only then load the package, so Expo Go and any build without it simply show no mic, with no error.
 */
type SpeechPackage = typeof import("expo-speech-recognition");
export type SpeechModule = SpeechPackage["ExpoSpeechRecognitionModule"];

const NATIVE_NAME = "ExpoSpeechRecognition"; // the name the package registers its native module under
let loaded: SpeechModule | null | undefined;

export function speechModule(): SpeechModule | null {
  if (loaded !== undefined) return loaded;
  if (!requireOptionalNativeModule(NATIVE_NAME)) return (loaded = null); // Expo Go, web, or a build without it
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = (require("expo-speech-recognition") as SpeechPackage).ExpoSpeechRecognitionModule;
  } catch {
    loaded = null;
  }
  return loaded;
}

let available: boolean | undefined;
/** Can this phone turn speech into text (the module is there and the phone has a recogniser)? Asked once. */
export function speechAvailable(): boolean {
  if (available !== undefined) return available;
  const m = speechModule();
  try { available = !!m && m.isRecognitionAvailable(); } catch { available = false; }
  return available;
}

/** The recogniser's language for the app's language: Indian Hindi or Indian English. */
export const speechLang = (appLanguage: string) => (appLanguage === "hi" ? "hi-IN" : "en-IN");

/** Speech added to what is already written: one space between, nothing beyond the limit. */
export function appendSpoken(current: string, spoken: string, max: number): { text: string; cut: boolean } {
  const add = spoken.trim();
  if (!add) return { text: current, cut: false };
  const joined = current.trim() ? `${current.replace(/\s+$/, "")} ${add}` : add;
  return { text: joined.slice(0, max), cut: joined.length > max };
}
