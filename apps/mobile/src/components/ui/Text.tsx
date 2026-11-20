import { Text as RNText, TextProps } from "react-native";

/** Size and weight per variant, and the colour used when the screen does not choose one. */
const variants = {
  title: ["text-2xl font-bold", "text-ink"],
  heading: ["text-xl font-semibold", "text-ink"],
  subtitle: ["text-base", "text-ink-muted"],
  body: ["text-base", "text-ink"],
  label: ["text-base font-medium", "text-ink"],
  caption: ["text-sm", "text-ink-muted"],
  small: ["text-xs", "text-ink-faint"],
} as const;

/** A colour class among the given classes (text-danger, text-brand-dark, text-white…), not a size such as text-sm. */
const COLOR_CLASS = /(^|\s)text-(ink|danger|success|brand|white|black|accent)(-[a-z]+)?(\/\d+)?(?=\s|$)/;

/**
 * Text in one of the app's variants. A colour given in `className` (e.g. "text-danger" for an error) always wins:
 * the variant's own colour is left out then. With both, the styling engine picked by its own order, so errors showed
 * grey instead of red.
 */
export function Text({ variant = "body", className = "", ...props }: TextProps & { variant?: keyof typeof variants; className?: string }) {
  const [base, color] = variants[variant];
  return <RNText className={`${base} ${COLOR_CLASS.test(className) ? "" : color} ${className}`} {...props} />;
}
