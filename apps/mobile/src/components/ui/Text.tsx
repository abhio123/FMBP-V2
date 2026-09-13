import { Text as RNText, TextProps } from "react-native";

const variants = {
  title: "text-2xl font-bold text-ink",
  heading: "text-xl font-semibold text-ink",
  subtitle: "text-base text-ink-muted",
  body: "text-base text-ink",
  label: "text-base font-medium text-ink",
  caption: "text-sm text-ink-muted",
  small: "text-xs text-ink-faint",
} as const;

export function Text({ variant = "body", className = "", ...props }: TextProps & { variant?: keyof typeof variants; className?: string }) {
  return <RNText className={`${variants[variant]} ${className}`} {...props} />;
}
