import { FlatList, View } from "react-native";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Text, Card, Button, EmptyState, TrustRow } from "@/components/ui";
import { useBlockActions, useMyBlocks } from "@/features/safety/useBlocks";

/** Businesses I blocked, each with Unblock (Profile → Blocked businesses). */
export default function BlockedBusinesses() {
  const { t } = useTranslation();
  const blocks = useMyBlocks();
  const actions = useBlockActions();
  return (
    <Screen scroll={false} padded={false}>
      <Stack.Screen options={{ title: t("safety.blockedList") }} />
      <FlatList
        data={blocks.data ?? []}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-center gap-3">
              <View className="flex-1"><TrustRow avatar logoUrl={item.logo_url} name={item.name} city={item.city} /></View>
              <Button title={t("safety.unblock")} variant="secondary" full={false} onPress={() => actions.unblock(item.id)} loading={actions.busy} />
            </View>
          </Card>
        )}
        ListEmptyComponent={blocks.isLoading ? <Text variant="caption">{t("common.loading")}</Text>
          : blocks.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => blocks.refetch()} />
          : <EmptyState icon="checkmark-circle-outline" title={t("safety.noBlocked")} />}
      />
    </Screen>
  );
}
