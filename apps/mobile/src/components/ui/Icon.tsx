import Ionicons from "@expo/vector-icons/Ionicons";
import type { ColorValue } from "react-native";
import { COLORS } from "@/theme";

/**
 * The app's one icon set: Ionicons line icons, one colour, the same on iPhone and Android (emoji look different on
 * every phone and read as decoration). Use <Icon> in the UI; <DataIcon> for icons that come from the database.
 */
export type IconName = keyof typeof Ionicons.glyphMap;

// colours = tailwind.config.js tokens (ink, brand, brand-dark, ink-muted, success, danger, accent)
export const ICON_COLOR = { ink: COLORS.ink, brand: COLORS.brand, brandDark: COLORS.brandDark, muted: COLORS.inkMuted, faint: COLORS.inkFaint, success: COLORS.success, danger: COLORS.danger, accent: COLORS.accent, white: COLORS.white } as const;

export function Icon({ name, size = 20, color = ICON_COLOR.ink }: { name: IconName; size?: number; color?: ColorValue }) {
  // decorative: the text next to it says what it is
  return <Ionicons name={name} size={size} color={color as string} accessible={false} importantForAccessibility="no" />;
}

/**
 * Post types, categories, intentions and offering types keep an emoji in the database (`icon`; older app versions
 * show it). The app draws the matching line icon instead. A value that is already an icon name is used as it is, so
 * the database can move to icon names later without an app change.
 */
const FROM_EMOJI_RAW: Record<string, IconName> = {
  // post types
  "📅": "calendar-outline", "📢": "megaphone-outline", "🏷": "pricetag-outline", "🎉": "ribbon-outline", "🛒": "cart-outline",
  "🎓": "school-outline", "🧾": "receipt-outline", "🛍": "bag-handle-outline", "🛵": "bicycle-outline", "🚚": "bus-outline",
  "👷": "people-outline", "🧑‍💻": "laptop-outline", "📱": "phone-portrait-outline", "⚖": "scale-outline", "⚙": "cog-outline",
  "🏭": "business-outline", "📣": "megaphone-outline", "🧭": "compass-outline", "💰": "cash-outline", "❓": "help-circle-outline",
  "🏬": "storefront-outline", "🧑‍🍳": "hammer-outline", "📦": "cube-outline", "💻": "desktop-outline", "🏚": "file-tray-stacked-outline",
  "🤝": "people-circle-outline", "🚛": "bus-outline", "✨": "sparkles-outline", "💼": "briefcase-outline", "🛠": "construct-outline",
  "🏢": "business-outline", "🚗": "car-outline", "🙋": "hand-right-outline", "👥": "people-outline", "🧑‍🏫": "easel-outline",
  // categories
  "🍽": "restaurant-outline", "🏪": "storefront-outline", "👗": "shirt-outline", "🌾": "leaf-outline", "📚": "book-outline",
  "🩺": "medkit-outline", "💇": "cut-outline", "🏗": "construct-outline", "🧵": "color-palette-outline", "📸": "camera-outline",
  // intentions, offering types
  "📈": "trending-up-outline", "🧑‍⚕️": "medkit-outline", "✈": "airplane-outline", "🛳": "boat-outline", "💸": "cash-outline",
  // information pages
  "💬": "chatbubbles-outline", "📄": "document-text-outline", "📋": "clipboard-outline", "🔒": "lock-closed-outline", "🛡": "shield-checkmark-outline", "📞": "call-outline",
  // categories added 2026-11-06
  "💡": "bulb-outline", "🔧": "build-outline", "🏨": "bed-outline",
};

// keys without the emoji variation selector (U+FE0F): the same emoji is stored with and without it
const bare = (e: string) => e.replace(/\uFE0F/g, "");
const FROM_EMOJI: Record<string, IconName> = Object.fromEntries(Object.entries(FROM_EMOJI_RAW).map(([k, v]) => [bare(k), v]));

export function iconFor(value: string | null | undefined, fallback: IconName = "ellipse-outline"): IconName {
  if (!value) return fallback;
  if (value in Ionicons.glyphMap) return value as IconName;
  return FROM_EMOJI[bare(value)] ?? fallback;
}

/** An icon stored in the database (see iconFor). */
export function DataIcon({ value, fallback, size = 20, color = ICON_COLOR.ink }: { value: string | null | undefined; fallback?: IconName; size?: number; color?: ColorValue }) {
  return <Icon name={iconFor(value, fallback)} size={size} color={color} />;
}
