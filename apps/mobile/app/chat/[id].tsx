import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, View, TextInput, Pressable, AppState } from "react-native";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { dayLabel, isNewDay } from "@fmbp/shared";
import { Text, EmptyState, useHeaderInset, Icon, ICON_COLOR, type IconName } from "@/components/ui";
import {
  getConversation, listMessagePage, mergeNewest, prependOlder, appendMessage, sendMessage, markConversationRead, subscribeToMessages,
  otherParty, getPostRefs, topicStarts, type MessageRow, type MessageWindow,
} from "@/features/chat/api";
import { MessageBubble } from "@/features/chat/MessageBubble";
import { loadDraft, saveDraft, type ChatDraft } from "@/features/chat/drafts";
import { useSession } from "@/store/session";
import { track } from "@/lib/analytics";
import { ReportDialog } from "@/features/safety/ReportDialog";
import { report, isBlockedError } from "@/features/safety/api";
import { useBlockActions, useMyBlocks } from "@/features/safety/useBlocks";

/** Message box height: one line (44, the minimum touch height) up to about five lines, then it scrolls. */
const INPUT_MIN = 44;
const INPUT_MAX = 120;

/**
 * One chat per pair of businesses. Context lives on the messages:
 * - the post a message is about is shown inside its bubble wherever the chat moves to a post;
 * - opened from a post (`about` param), the next message carries that post ("About: …" line above the box);
 * - swipe a message right (or press and hold) → Reply: the new message quotes it; tapping the quote jumps back to it.
 */
export default function Conversation() {
  const { id, about } = useLocalSearchParams<{ id: string; about?: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const router = useRouter();
  const qc = useQueryClient();
  const business = useSession((s) => s.business);
  const conv = useQuery({ queryKey: ["conversation", id], queryFn: () => getConversation(id!) });
  // Realtime is the fast path; polling keeps the chat alive when the socket cannot connect (LAN, Expo Go, proxies).
  const [live, setLive] = useState<boolean | null>(null);
  const msgs = useQuery({
    // only the newest page is fetched on every refresh; earlier pages the user loaded stay (see features/chat/api)
    queryKey: ["messages", id], queryFn: async () => mergeNewest(qc.getQueryData<MessageWindow>(["messages", id]), await listMessagePage(id!)),
    refetchInterval: live ? 15_000 : 4_000, refetchIntervalInBackground: false, refetchOnWindowFocus: true,
  });
  const [draft, setDraft] = useState("");
  const [inputHeight, setInputHeight] = useState(INPUT_MIN);
  // context for the next message: the post it is about (from the route) and/or the message it replies to
  const [aboutPostId, setAboutPostId] = useState<string | null>(about ?? null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  // The unsent message (text, reply, post) survives leaving the chat or closing the app (kept on the phone per chat,
  // see features/chat/drafts). A reply to a message no longer in the chat is dropped once the messages have loaded.
  const replyKnown = !replyToId || !msgs.data || msgs.data.rows.some((m) => m.id === replyToId);
  const unsent = useMemo<ChatDraft>(() => ({ text: draft, replyToId: replyKnown ? replyToId : null, aboutPostId }), [draft, replyToId, replyKnown, aboutPostId]);
  const unsentRef = useRef(unsent);
  useEffect(() => { unsentRef.current = unsent; }, [unsent]);
  const draftLoaded = useRef(false); // no saving before the saved draft is back, or the empty box would erase it
  useEffect(() => {
    if (!id) return;
    let alive = true;
    draftLoaded.current = false;
    void loadDraft(id).then((saved) => {
      if (!alive) return;
      const now = unsentRef.current;
      if (saved.text && !now.text) setDraft(saved.text);
      if (saved.replyToId && !now.replyToId) setReplyToId(saved.replyToId);
      if (saved.aboutPostId && !now.aboutPostId) setAboutPostId(saved.aboutPostId); // opened from a post: that post wins
      draftLoaded.current = true;
    });
    return () => { alive = false; if (draftLoaded.current) void saveDraft(id, unsentRef.current); }; // leaving the chat: save right away
  }, [id]);
  useEffect(() => {
    if (!id) return;
    const h = setTimeout(() => { if (draftLoaded.current) void saveDraft(id, unsent); }, 400); // while typing: save shortly after a pause
    return () => clearTimeout(h);
  }, [id, unsent]);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const listRef = useRef<FlatList<MessageRow>>(null);
  const myId = business?.id;
  // Keyboard: pad the screen by exactly the keyboard height the library reports (minus the bottom safe area the
  // SafeAreaView already adds). No view measurement or header arithmetic involved, which went wrong on some phones.
  const insets = useSafeAreaInsets();
  const keyboard = useReanimatedKeyboardAnimation(); // height is 0 closed, negative while open
  const avoidKeyboard = useAnimatedStyle(() => ({ paddingBottom: Math.max(0, -keyboard.height.value - insets.bottom) }), [insets.bottom]);

  // Realtime: append incoming messages; mark the other side's messages read while the screen is open.
  useEffect(() => {
    if (!id || !myId) return;
    const stop = subscribeToMessages(id, (m) => {
      qc.setQueryData<MessageWindow>(["messages", id], (old) => appendMessage(old, m));
      if (m.sender_business_id !== myId) void markConversationRead(id, myId);
    }, (status) => {
      if (status === "CLOSED") return; // normal teardown when leaving the screen
      setLive(status === "SUBSCRIBED");
      // anything that arrived while the socket was down
      if (status === "SUBSCRIBED") void qc.invalidateQueries({ queryKey: ["messages", id] });
    });
    void markConversationRead(id, myId).then(() => qc.invalidateQueries({ queryKey: ["conversations"] }));
    return stop;
  }, [id, myId, qc]);

  // Coming back from the background: refresh immediately instead of waiting for the next poll.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && id) { void qc.invalidateQueries({ queryKey: ["messages", id] }); void qc.invalidateQueries({ queryKey: ["conversations"] }); }
    });
    return () => sub.remove();
  }, [id, qc]);

  // Whenever the list changes (poll or realtime), unread messages from the other side get marked read.
  const unreadFromOther = (msgs.data?.rows ?? []).some((m) => m.sender_business_id !== myId && !m.read_at);
  useEffect(() => {
    if (id && myId && unreadFromOther) void markConversationRead(id, myId).then(() => qc.invalidateQueries({ queryKey: ["conversations"] }));
  }, [id, myId, unreadFromOther, qc]);

  const data = useMemo(() => msgs.data?.rows ?? [], [msgs.data]);

  // Earlier messages, a page at a time, on request.
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadOlder = async () => {
    const first = data[0];
    if (!id || !first || loadingOlder) return;
    setLoadingOlder(true); setErr(null);
    try {
      const page = await listMessagePage(id, { before: first.created_at });
      qc.setQueryData<MessageWindow>(["messages", id], (old) => prependOlder(old, page));
    } catch (e) { setErr((e as Error).message); } finally { setLoadingOlder(false); }
  };
  // Follow new messages only while the user is at the bottom: reading earlier messages is not interrupted, and the
  // list keeps its place when an earlier page is added on top (maintainVisibleContentPosition).
  const atBottom = useRef(true);
  const starts = useMemo(() => topicStarts(data), [data]);
  const byId = useMemo(() => new Map(data.map((m) => [m.id, m])), [data]);
  const replyTo = replyToId ? byId.get(replyToId) ?? null : null;
  // the post each message falls under (its own, else the one before it): shown in quotes
  const topicOf = useMemo(() => {
    const out = new Map<string, string | null>();
    let current: string | null = null;
    for (const m of data) { if (m.post_id) current = m.post_id; out.set(m.id, current); }
    return out;
  }, [data]);
  const refIds = useMemo(() => Array.from(new Set([...starts.values(), ...(aboutPostId ? [aboutPostId] : [])])).sort(), [starts, aboutPostId]);
  const refs = useQuery({ queryKey: ["post_refs", id, refIds], enabled: !!id && refIds.length > 0, queryFn: () => getPostRefs(id!, refIds), staleTime: 60_000 });
  const postTitle = (postId: string | null | undefined): string | null => (postId ? refs.data?.get(postId)?.title ?? null : null);

  const send = async () => {
    if (!id || !myId || !draft.trim()) return;
    setSending(true); setErr(null);
    try {
      const m = await sendMessage(id, myId, draft, { about: aboutPostId, replyTo: replyTo?.id });
      atBottom.current = true; // my own message: always show it
      qc.setQueryData<MessageWindow>(["messages", id], (old) => appendMessage(old, m));
      setDraft(""); void saveDraft(id, { text: "", replyToId: null, aboutPostId: null }); setInputHeight(INPUT_MIN); setAboutPostId(null); setReplyToId(null); // context applies to this one message; the card now marks it
      track("message_sent");
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch (e) { setErr(isBlockedError(e) ? t("safety.cannotMessage") : (e as Error).message); } finally { setSending(false); }
  };

  const other = conv.data && myId ? otherParty(conv.data, myId) : null;
  const otherId = conv.data && myId ? (conv.data.business_a === myId ? conv.data.business_b : conv.data.business_a) : null;
  const otherName = other?.name ?? (conv.data ? t("safety.deletedBusiness") : "");
  // report / block the other business (header ⋯); while I block them, the message box is replaced by an Unblock bar
  const blocks = useMyBlocks();
  const blockActions = useBlockActions();
  const iBlocked = !!otherId && blocks.ids.has(otherId);
  const [reportOpen, setReportOpen] = useState(false);
  const openMenu = () => {
    if (!otherId || !other) return;
    Alert.alert(otherName, undefined, [
      { text: t("safety.reportBusiness"), onPress: () => setReportOpen(true) },
      iBlocked ? { text: t("safety.unblock"), onPress: () => blockActions.unblock(otherId) }
        : { text: t("safety.blockBusiness"), style: "destructive", onPress: () => blockActions.confirmBlock(otherId, otherName, () => track("business_blocked")) },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };
  const nameOf = (m: MessageRow) => (m.sender_business_id === myId ? t("chat.you") : other?.name ?? "");
  const header = useHeaderInset(); // list starts below the iOS 26 header

  // Tap on a quote: scroll to the quoted message and flash it (like WhatsApp).
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const jumpTo = useCallback((messageId: string) => {
    const index = data.findIndex((m) => m.id === messageId);
    if (index < 0) return;
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.4 });
    setHighlightedId(messageId);
    setTimeout(() => setHighlightedId((h) => (h === messageId ? null : h)), 1600);
  }, [data]);
  const openPost = (postId: string) => router.push({ pathname: "/post/[id]", params: { id: postId } });

  return (
    <SafeAreaView onLayout={header.onLayout} className="flex-1 bg-surface" style={{ paddingTop: header.inset }} edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{
        title: otherName, headerBackTitle: "",
        headerRight: other ? () => (
          <Pressable accessibilityRole="button" accessibilityLabel={t("safety.more")} onPress={openMenu} hitSlop={8} className="min-h-[44px] min-w-[44px] items-center justify-center">
            <Text className="text-2xl text-ink">⋯</Text>
          </Pressable>
        ) : undefined,
      }} />
      <Animated.View style={[{ flex: 1 }, avoidKeyboard]}>
        {conv.isError || msgs.isError ? (
          <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => { conv.refetch(); msgs.refetch(); }} />
        ) : (
          <FlatList
            ref={listRef}
            data={data}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1, justifyContent: "flex-end" }}
            onContentSizeChange={() => { if (atBottom.current) listRef.current?.scrollToEnd({ animated: false }); }}
            onScroll={(e) => {
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              atBottom.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
            }}
            scrollEventThrottle={100}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            ListHeaderComponent={msgs.data?.hasOlder ? (
              <Pressable accessibilityRole="button" onPress={loadOlder} disabled={loadingOlder}
                className="mb-2 min-h-[44px] items-center justify-center self-center rounded-full border border-line bg-surface px-4">
                <Text variant="small" className="font-semibold text-brand">{loadingOlder ? t("common.loading") : t("chat.loadEarlier")}</Text>
              </Pressable>
            ) : undefined}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onScrollToIndexFailed={(info) => {
              // item not measured yet: jump close by, then retry
              listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
              setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.4 }), 250);
            }}
            renderItem={({ item, index }) => {
              const mine = item.sender_business_id === myId;
              const topic = starts.get(item.id);
              const quoted = item.reply_to_id ? byId.get(item.reply_to_id) : undefined;
              // "Today" / "Yesterday" / "3 Nov 2026" wherever the day changes (like WhatsApp); bubbles keep only the time
              const dayHeading = isNewDay(data[index - 1]?.created_at, item.created_at) ? (
                // centred with plain styles: the layout must not depend on utility classes being generated
                <View style={{ alignItems: "center", marginVertical: 4 }}>
                  <Text variant="small" accessibilityRole="header"
                    style={{ backgroundColor: "#E5E7EB", color: "#6B7280", fontWeight: "600", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, overflow: "hidden" }}>
                    {dayLabel(item.created_at, lang)}
                  </Text>
                </View>
              ) : null;
              return (
                <>{dayHeading}<MessageBubble
                  message={item}
                  mine={mine}
                  receipt={mine && index === data.length - 1 ? (item.read_at ? t("chat.seen") : t("chat.sent")) : null}
                  post={topic ? { postRef: refs.data?.get(topic), loading: refs.isLoading, onOpen: () => openPost(topic) } : undefined}
                  quote={item.reply_to_id ? {
                    name: quoted ? nameOf(quoted) : "…", body: quoted?.body ?? null, postTitle: quoted ? postTitle(topicOf.get(quoted.id)) : null,
                    onJump: () => item.reply_to_id && jumpTo(item.reply_to_id),
                  } : undefined}
                  highlighted={highlightedId === item.id}
                  onReply={() => setReplyToId(item.id)}
                /></>
              );
            }}
            ListEmptyComponent={msgs.isLoading ? <Text variant="caption">{t("common.loading")}</Text> : <Text variant="caption" className="text-center">{t("chat.sayHello", { name: other?.name ?? "" })}</Text>}
          />
        )}
        {err ? <Text variant="caption" className="px-4 text-danger">{err}</Text> : null}
        {live === false ? <Text variant="small" className="px-4 pb-1 text-center">{t("chat.liveUnavailable")}</Text> : null}
        {/* context for the next message, each removable */}
        {aboutPostId ? (
          <ContextBar label={t("chat.about", { title: postTitle(aboutPostId) ?? "…" })} icon="pin-outline" onRemove={() => setAboutPostId(null)} removeLabel={t("chat.remove")} />
        ) : null}
        {/* several posts in one chat: show how to reply to a specific message */}
        {!replyTo && starts.size >= 2 ? <Text variant="small" className="px-4 pb-1 text-center">{t("chat.replyHint")}</Text> : null}
        {replyTo ? (
          <ContextBar label={`${t("chat.replyingTo", { name: nameOf(replyTo) })}: ${replyTo.body ?? ""}`} icon="arrow-undo-outline" onRemove={() => setReplyToId(null)} removeLabel={t("chat.remove")} />
        ) : null}
        {iBlocked ? (
          <View className="flex-row items-center gap-3 border-t border-line px-4 py-3">
            <Text variant="caption" className="flex-1">{t("safety.youBlocked")}</Text>
            <Pressable accessibilityRole="button" onPress={() => otherId && blockActions.unblock(otherId)} className="min-h-[44px] justify-center rounded-full bg-brand-light px-4">
              <Text className="font-semibold text-brand-dark">{t("safety.unblock")}</Text>
            </Pressable>
          </View>
        ) : (
        <View className="flex-row items-end gap-2 border-t border-line px-3 py-2">
          <TextInput
            value={draft}
            onChangeText={(s) => { setDraft(s); if (!s) setInputHeight(INPUT_MIN); }}
            placeholder={t("chat.placeholder")}
            multiline
            accessibilityLabel={t("chat.placeholder")}
            // explicit height: iOS does not shrink a grown multiline input when its text is cleared after sending
            onContentSizeChange={(e) => setInputHeight(Math.min(INPUT_MAX, Math.max(INPUT_MIN, Math.ceil(e.nativeEvent.contentSize.height))))}
            style={{ height: inputHeight }}
            className="flex-1 rounded-2xl border border-line bg-surface-muted px-4 py-2 text-base text-ink"
          />
          <Pressable accessibilityRole="button" onPress={send} disabled={sending || !draft.trim()}
            className={`h-11 min-w-[44px] items-center justify-center rounded-full px-4 ${draft.trim() ? "bg-brand" : "bg-line"}`}>
            <Text className="font-semibold text-white">{t("chat.send")}</Text>
          </Pressable>
        </View>
        )}
      </Animated.View>
      <ReportDialog visible={reportOpen} title={t("safety.reportBusiness")} onClose={() => setReportOpen(false)}
        onSubmit={async (reason, note) => {
          if (!myId || !otherId) return;
          await report(myId, "business", otherId, reason, note);
          setReportOpen(false);
          track("business_reported", { reason, from: "chat" });
          Alert.alert(t("safety.report"), t("safety.reportedBusiness"));
        }} />
    </SafeAreaView>
  );
}

/** Removable context line above the message box ("About: …" or "Replying to …"). */
function ContextBar({ label, icon, onRemove, removeLabel }: { label: string; icon: IconName; onRemove: () => void; removeLabel: string }) {
  return (
    <View className="flex-row items-center gap-2 border-t border-line bg-brand-light px-4 py-2">
      <Text className="text-brand-dark">{icon}</Text>
      <Text variant="caption" numberOfLines={1} className="flex-1 text-brand-dark">{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={removeLabel} onPress={onRemove} hitSlop={10} className="h-8 w-8 items-center justify-center">
        <Icon name="close" size={18} color={ICON_COLOR.brandDark} />
      </Pressable>
    </View>
  );
}
