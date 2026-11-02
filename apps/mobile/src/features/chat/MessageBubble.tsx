import { useRef } from "react";
import { Pressable, View } from "react-native";
import Swipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui";
import type { MessageRow, PostRef } from "./api";

type Props = {
  message: MessageRow;
  mine: boolean;
  /** Read receipt under my last message. */
  receipt: string | null;
  /** Set on the message where the chat moves to a post: shown inside the bubble, above the text. */
  post?: { postRef: PostRef | undefined; loading: boolean; onOpen: () => void };
  /** The message this one replies to (shown as a quote; tap jumps to it). */
  quote?: { name: string; body: string | null; postTitle: string | null; onJump: () => void };
  /** Briefly true after jumping to this message from a quote. */
  highlighted: boolean;
  onReply: () => void;
};

/**
 * One chat message. Reply like WhatsApp/Instagram: swipe the bubble to the right (a reply arrow fades in) or press and
 * hold it. The post a message is about and the message it quotes are drawn INSIDE the bubble, so it is always clear
 * which message they belong to.
 */
export function MessageBubble({ message, mine, receipt, post, quote, highlighted, onReply }: Props) {
  const { t } = useTranslation();
  const swipe = useRef<SwipeableMethods>(null);
  const sub = mine ? "text-brand-light" : "text-ink-muted";
  const inset = mine ? "bg-white/15 border-white/60" : "bg-surface border-brand";
  return (
    <Swipeable
      ref={swipe}
      friction={2}
      leftThreshold={56}
      overshootLeft={false}
      // dragging right fades in the reply arrow; reaching the threshold sets the reply and springs back
      renderLeftActions={(progress) => <ReplyArrow progress={progress} />}
      onSwipeableWillOpen={onReply}
      onSwipeableOpen={() => swipe.current?.close()}
    >
      <View className={`rounded-2xl ${highlighted ? "bg-accent/20" : ""}`}>
        <Pressable onLongPress={onReply} delayLongPress={300} accessibilityHint={t("chat.replyA11y")}
          className={`max-w-[85%] rounded-2xl px-3 py-2 ${mine ? "self-end rounded-br-sm bg-brand" : "self-start rounded-bl-sm bg-surface-muted"}`}>
          {post ? <PostPreview {...post} mine={mine} inset={inset} sub={sub} /> : null}
          {quote ? (
            <Pressable onPress={quote.onJump} accessibilityRole="button" className={`mb-1.5 rounded-lg border-l-4 px-2 py-1 ${inset}`}>
              <Text variant="small" className={`font-semibold ${mine ? "text-white" : "text-brand-dark"}`}>{quote.name}</Text>
              <Text variant="small" numberOfLines={2} className={sub}>{quote.body ?? "…"}</Text>
              {quote.postTitle ? <Text variant="small" numberOfLines={1} className={sub}>📌 {quote.postTitle}</Text> : null}
            </Pressable>
          ) : null}
          <Text className={`px-1 ${mine ? "text-white" : "text-ink"}`}>{message.body}</Text>
          <Text variant="small" className={`mt-0.5 px-1 ${mine ? "text-brand-light" : ""}`}>
            {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{receipt ? ` · ${receipt}` : ""}
          </Text>
        </Pressable>
      </View>
    </Swipeable>
  );
}

/**
 * Reply arrow behind the bubble. Invisible at rest (a right-aligned bubble leaves the row's left side empty, so it
 * would otherwise show through); it fades in and grows only while the message is dragged to the right.
 */
function ReplyArrow({ progress }: { progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.25, 1], [0, 0.5, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1], Extrapolation.CLAMP) }],
  }));
  return (
    <View className="w-14 items-center justify-center">
      <Animated.View style={style} className="h-9 w-9 items-center justify-center rounded-full bg-brand-light">
        <Ionicons name="arrow-undo" size={18} color="#144A40" />
      </Animated.View>
    </View>
  );
}

/** The post this message is about: icon, title and (when not live) its status. Tap opens the post. */
function PostPreview({ postRef, loading, onOpen, inset, sub, mine }: NonNullable<Props["post"]> & { inset: string; sub: string; mine: boolean }) {
  const { t } = useTranslation();
  const status = postRef ? (postRef.deleted ? t("chat.postRemoved") : postRef.status !== "active" ? t(`post.status.${postRef.status}`) : null) : null;
  return (
    <Pressable onPress={onOpen} disabled={!postRef || postRef.deleted} accessibilityRole="button"
      className={`mb-1.5 flex-row items-center gap-2 rounded-lg border-l-4 px-2 py-1.5 ${inset}`}>
      <Text className="text-base">{postRef?.icon ?? "📌"}</Text>
      <View className="shrink">
        <Text variant="small" className={sub}>{t("chat.aboutPost")}{status ? ` · ${status}` : ""}</Text>
        <Text variant="caption" numberOfLines={2} className={`font-semibold ${mine ? "text-white" : "text-ink"}`}>
          {postRef?.title ?? (loading ? "…" : t("chat.postUnavailable"))}
        </Text>
      </View>
    </Pressable>
  );
}
