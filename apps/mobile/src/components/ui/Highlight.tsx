import { useMemo } from "react";
import { Text as RNText, type TextProps } from "react-native";
import { highlightSegments } from "@/lib/highlight";
import { Text } from "./Text";

type Props = TextProps & { text: string; terms?: string[]; variant?: Parameters<typeof Text>[0]["variant"]; className?: string };

/**
 * Text with the letters that matched a search marked like a highlighter pen (amber background, bold), so a result shows
 * why it matched ("jale" → **Jale**bi, **jale**dar). Without `terms` it renders exactly like <Text>.
 * Matched pieces are nested RN Text, so they inherit the size/colour of the line and truncation (numberOfLines) still works.
 */
export function Highlight({ text, terms, ...rest }: Props) {
  const segments = useMemo(() => highlightSegments(text, terms ?? []), [text, terms]);
  if (segments.length === 1 && !segments[0].match) return <Text {...rest}>{text}</Text>;
  return (
    <Text {...rest}>
      {segments.map((s, i) => (s.match ? <RNText key={i} className="bg-accent/30 font-bold text-ink">{s.text}</RNText> : s.text))}
    </Text>
  );
}
