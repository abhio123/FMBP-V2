import { FlatList, RefreshControl, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatDate } from "@fmbp/shared";
import { Avatar, Button, Card, Chip, DataIcon, EmptyState, Icon, ICON_COLOR, Text } from "@/components/ui";
import {
  ADMIN_PAGE, listBusinesses, listDeals, listPosts, listResponses, restorePost, unsuspendBusiness,
  type AdminBusinessRow, type AdminDealRow, type AdminPostRow, type AdminResponseRow, type BusinessFilter, type PostFilter,
} from "@/features/admin/api";
import { ReasonDialog } from "@/features/admin/ReasonDialog";
import { useAdminAction } from "@/features/admin/useAdminAction";

type AdminListKind = "businesses" | "posts" | "deals" | "responses";
const BUSINESS_FILTERS: BusinessFilter[] = ["all", "new", "suspended", "deleting", "verified"];
const POST_FILTERS: PostFilter[] = ["live", "new", "hidden", "removed"];
type Row = AdminBusinessRow | AdminPostRow | AdminDealRow | AdminResponseRow;

/**
 * What is behind a dashboard tile: businesses (all / new / suspended / being deleted / verified), posts (live / new /
 * hidden / removed), confirmed deals, replies. Newest first, 50 at a time. A row opens its business; suspended
 * businesses can be lifted and removed posts restored right here.
 */
export default function AdminList() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const router = useRouter();
  const params = useLocalSearchParams<{ kind: AdminListKind; filter?: string }>();
  const kind: AdminListKind = params.kind ?? "businesses";
  const filter = params.filter ?? (kind === "posts" ? "live" : "all");
  const { run, withReason, ask, closeAsk } = useAdminAction();
  const list = useInfiniteQuery({
    queryKey: ["admin", "list", kind, filter],
    initialPageParam: 0,
    queryFn: ({ pageParam }): Promise<Row[]> =>
      kind === "businesses" ? listBusinesses(filter as BusinessFilter, pageParam)
      : kind === "posts" ? listPosts(filter as PostFilter, pageParam)
      : kind === "deals" ? listDeals(pageParam) : listResponses(pageParam),
    getNextPageParam: (last, all) => (last.length < ADMIN_PAGE ? undefined : all.length * ADMIN_PAGE),
  });
  const rows = list.data?.pages.flat() ?? [];
  const date = (d: string | null) => (d ? formatDate(d, lang) : "");
  const open = (businessId: string) => router.push({ pathname: "/admin/business/[id]", params: { id: businessId } });
  const setFilter = (f: string) => router.setParams({ filter: f });

  const business = (b: AdminBusinessRow) => (
    <Card raised className="mb-3 gap-2" onPress={() => open(b.id)}>
      <View className="flex-row items-center gap-3">
        <Avatar name={b.name} uri={b.logo_url} size={40} />
        <View className="flex-1">
          <View className="flex-row items-center gap-1">
            <Text variant="label" numberOfLines={1} className="shrink">{b.name}</Text>
            {b.verification_status === "verified" ? <Icon name="shield-checkmark" size={16} color={ICON_COLOR.success} /> : null}
          </View>
          <Text variant="caption" numberOfLines={1}>{[b.city, b.owner_phone ? `+${b.owner_phone}` : null].filter(Boolean).join(" · ")}</Text>
          <Text variant="small">{t("admin.joined", { date: date(b.created_at) })} · {t("admin.livePosts", { count: b.posts_live })}</Text>
        </View>
        <Icon name="chevron-forward" size={20} color={ICON_COLOR.faint} />
      </View>
      {b.suspended_at ? (
        <View className="gap-2 rounded-xl bg-danger/10 p-3">
          <Text variant="caption" className="text-danger">{t("admin.suspendedSince", { date: date(b.suspended_at) })}{b.suspension_reason ? ` · ${b.suspension_reason}` : ""}</Text>
          <Button title={t("admin.unsuspend")} icon="refresh-outline" full={false}
            onPress={() => withReason("unsuspend", { title: t("admin.unsuspendTitle", { name: b.name }), message: t("admin.unsuspendBody"), confirm: t("admin.unsuspend"), optional: true },
              (note) => unsuspendBusiness(b.id, note || null))} />
        </View>
      ) : null}
      {b.erase_on ? <Text variant="small" className="text-danger">{t("admin.erasedOn", { date: date(b.erase_on) })}</Text> : null}
    </Card>
  );
  const post = (p: AdminPostRow) => (
    <Card raised className="mb-3 gap-2" onPress={() => open(p.business_id)}>
      <View className="flex-row items-center gap-3">
        <DataIcon value={p.icon} fallback="pin-outline" size={22} color={ICON_COLOR.brand} />
        <View className="flex-1">
          <Text variant="label" numberOfLines={2} className={p.removed ? "line-through" : ""}>{p.title}</Text>
          <Text variant="caption" numberOfLines={1}>{p.business_name} · {p.city}</Text>
          <Text variant="small">
            {date(p.created_at)} · {t(`post.status.${p.status}`, { defaultValue: p.status })} · {t("post.responses", { count: p.response_count })}
            {p.hidden ? ` · ${t("admin.flags.hidden")}` : ""}{p.removed ? ` · ${t("admin.flags.removed")}` : ""}
          </Text>
        </View>
        <Icon name="chevron-forward" size={20} color={ICON_COLOR.faint} />
      </View>
      {p.removed ? <Button title={t("admin.restorePost")} icon="refresh-outline" variant="secondary" full={false} onPress={() => run("restore_post", () => restorePost(p.id, null))} /> : null}
    </Card>
  );
  const deal = (d: AdminDealRow) => (
    <Card raised className="mb-3 gap-1" onPress={() => open(d.business_a)}>
      <View className="flex-row items-center gap-2">
        <DataIcon value={d.post_icon} fallback="pin-outline" size={18} color={ICON_COLOR.brand} />
        <Text variant="label" numberOfLines={1} className="shrink">{d.post_title ?? t("deals.done")}</Text>
      </View>
      <Text variant="caption">{d.business_a_name} ↔ {d.business_b_name}</Text>
      <Text variant="small">{date(d.completed_at)}{d.counted ? "" : ` · ${t("admin.notCounted")}`}</Text>
    </Card>
  );
  const response = (r: AdminResponseRow) => (
    <Card raised className="mb-3 gap-1" onPress={() => open(r.responder_id)}>
      <View className="flex-row items-center gap-2">
        <DataIcon value={r.post_icon} fallback="pin-outline" size={18} color={ICON_COLOR.brand} />
        <Text variant="label" numberOfLines={1} className="shrink">{r.post_title}</Text>
      </View>
      <Text variant="caption">{t("admin.repliedTo", { from: r.responder_name, to: r.owner_name })}</Text>
      <Text variant="small">{date(r.created_at)}</Text>
    </Card>
  );
  const item = ({ item: r }: { item: Row }) =>
    kind === "businesses" ? business(r as AdminBusinessRow) : kind === "posts" ? post(r as AdminPostRow)
    : kind === "deals" ? deal(r as AdminDealRow) : response(r as AdminResponseRow);
  const filters = kind === "businesses" ? BUSINESS_FILTERS : kind === "posts" ? POST_FILTERS : [];

  return (
    <View className="flex-1 bg-surface-muted">
      <Stack.Screen options={{ title: t(`admin.lists.${kind}`) }} />
      {filters.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-[68px] grow-0" contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
          {filters.map((f) => <Chip key={f} label={t(`admin.filters.${kind}.${f}`)} selected={filter === f} onPress={() => setFilter(f)} />)}
        </ScrollView>
      ) : null}
      <FlatList data={rows} keyExtractor={(r) => r.id} renderItem={item}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: filters.length ? 0 : 16, paddingBottom: 32 }}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()} onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => { void list.refetch(); }} />}
        ListFooterComponent={list.isFetchingNextPage ? <Text variant="caption" className="py-3 text-center">{t("common.loading")}</Text> : undefined}
        ListEmptyComponent={list.isLoading ? <Text variant="caption">{t("common.loading")}</Text>
          : list.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => list.refetch()} />
          : <EmptyState icon="file-tray-outline" title={t("admin.listEmpty")} />} />
      <ReasonDialog request={ask} onClose={closeAsk} />
    </View>
  );
}
