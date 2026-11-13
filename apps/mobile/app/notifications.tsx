import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { Stack } from "expo-router";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dayLabel, formatTime } from "@fmbp/shared";
import { EmptyState, Icon, ICON_COLOR, Text, type IconName } from "@/components/ui";
import { inboxIcon, INBOX_PAGE, listInbox, markInboxRead, type InboxItem } from "@/features/notifications/api";
import { INBOX_KEYS } from "@/features/notifications/Bell";
import { useOpenNotification } from "@/features/notifications/useOpenNotification";
import { NotificationDialog } from "@/features/notifications/NotificationDialog";

/**
 * Every notification sent to me (not chat messages, which have their own tab), newest first. Opening the list marks
 * them read, so the bell number goes away; the ones that were new keep a dot and a tint while I am here. Tapping one
 * opens it in a pop-up (whole text, tappable links in broadcasts, a button to what it is about).
 */
export default function Notifications() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const qc = useQueryClient();
  const list = useInfiniteQuery({
    queryKey: INBOX_KEYS.list,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => listInbox(pageParam),
    getNextPageParam: (last) => (last.length < INBOX_PAGE ? undefined : last[last.length - 1].created_at),
  });
  const items = list.data?.pages.flat() ?? [];
  // marking read updates the server and the bell only; the list keeps what it loaded, so the new ones stay
  // highlighted while I am here (a pull to refresh shows them as read)
  const hasUnread = items.some((x) => !x.read);
  useEffect(() => {
    if (!hasUnread) return;
    markInboxRead().then(() => qc.setQueryData(INBOX_KEYS.unread, 0)).catch(() => { /* tried again next time */ });
  }, [hasUnread, qc]);

  const [selected, setSelected] = useState<InboxItem | null>(null);
  // from the pop-up: go to what it is about (the pop-up closes first)
  const openNotification = useOpenNotification();
  const goTo = (n: InboxItem) => {
    setSelected(null);
    void openNotification(n.data);
  };
  const item = ({ item: n }: { item: InboxItem }) => {
    const isNew = !n.read;
    return (
      <Pressable accessibilityRole="button" accessibilityHint={t("inbox.openHint")} onPress={() => setSelected(n)}
        className={`flex-row gap-3 border-b border-line px-4 py-3 ${isNew ? "bg-brand-light" : "bg-surface"}`}>
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
          <Icon name={inboxIcon(n.kind) as IconName} size={22} color={ICON_COLOR.brand} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text variant="label" className={isNew ? "font-semibold" : ""}>{n.title}</Text>
          {n.body ? <Text variant="caption" numberOfLines={2}>{n.body}</Text> : null}
          <Text variant="small">{dayLabel(n.created_at, lang)} · {formatTime(n.created_at)}</Text>
        </View>
        {isNew ? <View accessibilityLabel={t("inbox.new")} className="mt-2 h-2.5 w-2.5 rounded-full bg-accent" /> : null}
        <Icon name="chevron-forward" size={18} color={ICON_COLOR.faint} />
      </Pressable>
    );
  };
  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen options={{ title: t("inbox.title") }} />
      <FlatList data={items} keyExtractor={(n) => n.id} renderItem={item}
        // iOS: the navigation header is see-through and the page starts under it; inset the list below it (as Screen does)
        contentInsetAdjustmentBehavior="automatic"
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()} onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => { void list.refetch(); }} />}
        ListFooterComponent={list.isFetchingNextPage ? <Text variant="caption" className="py-3 text-center">{t("common.loading")}</Text> : undefined}
        ListEmptyComponent={list.isLoading ? <Text variant="caption" className="p-4">{t("common.loading")}</Text>
          : list.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => list.refetch()} />
          : <EmptyState icon="notifications-outline" title={t("inbox.empty")} />} />
      <NotificationDialog item={selected} onClose={() => setSelected(null)} onOpen={goTo} />
    </View>
  );
}
