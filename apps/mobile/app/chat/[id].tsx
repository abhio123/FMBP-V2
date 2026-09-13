import { useEffect, useRef, useState } from "react";
import { FlatList, View, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, EmptyState } from "@/components/ui";
import { getConversation, listMessages, sendMessage, markConversationRead, subscribeToMessages, otherParty, type MessageRow } from "@/features/chat/api";
import { useSession } from "@/store/session";
import { track } from "@/lib/analytics";

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const business = useSession((s) => s.business);
  const conv = useQuery({ queryKey: ["conversation", id], queryFn: () => getConversation(id!) });
  const msgs = useQuery({ queryKey: ["messages", id], queryFn: () => listMessages(id!) });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const listRef = useRef<FlatList<MessageRow>>(null);
  const insets = useSafeAreaInsets();
  const myId = business?.id;
  // Native stack header (44pt iOS / 56dp Android) + status bar sits above this screen.
  const headerOffset = insets.top + (Platform.OS === "ios" ? 44 : 56);

  // Realtime: append incoming messages; mark the other side's messages read while the screen is open.
  useEffect(() => {
    if (!id || !myId) return;
    const stop = subscribeToMessages(id, (m) => {
      qc.setQueryData<MessageRow[]>(["messages", id], (old = []) => (old.some((x) => x.id === m.id) ? old : [...old, m]));
      if (m.sender_business_id !== myId) void markConversationRead(id, myId);
    });
    void markConversationRead(id, myId).then(() => qc.invalidateQueries({ queryKey: ["conversations"] }));
    return stop;
  }, [id, myId, qc]);

  const send = async () => {
    if (!id || !myId || !draft.trim()) return;
    setSending(true); setErr(null);
    try {
      const m = await sendMessage(id, myId, draft);
      qc.setQueryData<MessageRow[]>(["messages", id], (old = []) => (old.some((x) => x.id === m.id) ? old : [...old, m]));
      setDraft("");
      track("message_sent");
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch (e) { setErr((e as Error).message); } finally { setSending(false); }
  };

  const other = conv.data && myId ? otherParty(conv.data, myId) : null;
  const data = msgs.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: other?.name ?? "", headerBackTitle: "" }} />
      <KeyboardAvoidingView className="flex-1" behavior="padding" keyboardVerticalOffset={headerOffset}>
        {conv.data?.post ? (
          <Pressable onPress={() => router.push({ pathname: "/post/[id]", params: { id: conv.data!.post!.id } })} className="border-b border-line bg-surface-muted px-4 py-2">
            <Text variant="caption" numberOfLines={1}>📌 {t("chat.about", { title: conv.data.post.title })}</Text>
          </Pressable>
        ) : null}
        {conv.isError || msgs.isError ? (
          <EmptyState icon="⚠️" title={t("common.error")} cta={t("common.retry")} onPress={() => { conv.refetch(); msgs.refetch(); }} />
        ) : (
          <FlatList
            ref={listRef}
            data={data}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1, justifyContent: "flex-end" }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            renderItem={({ item }) => {
              const mine = item.sender_business_id === myId;
              return (
                <View className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? "self-end rounded-br-sm bg-brand" : "self-start rounded-bl-sm bg-surface-muted"}`}>
                  <Text className={mine ? "text-white" : "text-ink"}>{item.body}</Text>
                  <Text variant="small" className={`mt-0.5 ${mine ? "text-brand-light" : ""}`}>{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                </View>
              );
            }}
            ListEmptyComponent={msgs.isLoading ? <Text variant="caption">{t("common.loading")}</Text> : <Text variant="caption" className="text-center">{t("chat.sayHello", { name: other?.name ?? "" })}</Text>}
          />
        )}
        {err ? <Text variant="caption" className="px-4 text-danger">{err}</Text> : null}
        <View className="flex-row items-end gap-2 border-t border-line px-3 py-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t("chat.placeholder")}
            multiline
            accessibilityLabel={t("chat.placeholder")}
            className="max-h-[120px] min-h-[44px] flex-1 rounded-2xl border border-line bg-surface-muted px-4 py-2 text-base text-ink"
          />
          <Pressable accessibilityRole="button" onPress={send} disabled={sending || !draft.trim()}
            className={`h-11 min-w-[44px] items-center justify-center rounded-full px-4 ${draft.trim() ? "bg-brand" : "bg-line"}`}>
            <Text className="font-semibold text-white">{t("chat.send")}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
