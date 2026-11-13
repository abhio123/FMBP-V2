import { Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text } from "./Text";
import { COLORS } from "@/theme";

type Tone = "neutral" | "active" | "whatsapp";

const BRAND = COLORS.brand;
const BRAND_DARK = COLORS.brandDark; // tailwind brand.dark
/** WhatsApp's brand green, so the logo is recognised at a glance. */
const WHATSAPP_GREEN = COLORS.whatsapp;

const tones: Record<Tone, { box: string; bg?: string; icon: string }> = {
  neutral: { box: "bg-brand-light", icon: BRAND_DARK },
  active: { box: "", bg: BRAND, icon: COLORS.white },
  whatsapp: { box: "", bg: WHATSAPP_GREEN, icon: COLORS.white },
};

/**
 * Round icon button with a one-word label under it, for quick actions (share, WhatsApp, save).
 * Every icon sits in the same circle, so brand logos of different shapes line up, and the label keeps it usable for
 * people who don't recognise an icon. 52 px circle (above the 44–48 px minimum touch target).
 */
export function IconAction({ icon, label, onPress, tone = "neutral" }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; tone?: Tone;
}) {
  const s = tones[tone];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4} className="w-[72px] items-center gap-1">
      <View className={`h-[52px] w-[52px] items-center justify-center rounded-full ${s.box}`} style={s.bg ? { backgroundColor: s.bg } : undefined}>
        <Ionicons name={icon} size={26} color={s.icon} />
      </View>
      <Text variant="small" numberOfLines={1} className="text-ink-muted">{label}</Text>
    </Pressable>
  );
}
