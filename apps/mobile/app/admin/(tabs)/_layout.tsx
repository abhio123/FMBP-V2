import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ColorValue } from "react-native";
import { adminStats } from "@/features/admin/api";
import { ADMIN_HEADER } from "@/features/admin/theme";

type IconName = keyof typeof Ionicons.glyphMap;
type IconProps = { focused: boolean; color: ColorValue; size: number };
function TabIcon({ name, outline, focused, color, size }: IconProps & { name: IconName; outline: IconName }) {
  return <Ionicons name={focused ? name : outline} size={size} color={color as string} />;
}

/** Admin tabs. Reports and Verify show how many are waiting (same query as the dashboard, refreshed every minute). */
export default function AdminTabs() {
  const { t } = useTranslation();
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: adminStats, refetchInterval: 60_000, refetchIntervalInBackground: false });
  const badge = (n: number | undefined) => (n ? (n > 99 ? "99+" : n) : undefined);
  const badgeStyle = { backgroundColor: "#F59E0B", color: "#111827", fontSize: 11 };
  return (
    <Tabs screenOptions={{ ...ADMIN_HEADER, headerShown: true, tabBarActiveTintColor: "#111827", tabBarLabelStyle: { fontSize: 12 } }}>
      <Tabs.Screen name="dashboard" options={{ title: t("admin.tabs.dashboard"), headerTitle: t("admin.title"), tabBarIcon: (p: IconProps) => <TabIcon name="speedometer" outline="speedometer-outline" {...p} /> }} />
      <Tabs.Screen name="reports" options={{ title: t("admin.tabs.reports"), tabBarIcon: (p: IconProps) => <TabIcon name="flag" outline="flag-outline" {...p} />, tabBarBadge: badge(stats.data?.open_reports), tabBarBadgeStyle: badgeStyle }} />
      <Tabs.Screen name="verify" options={{ title: t("admin.tabs.verify"), tabBarIcon: (p: IconProps) => <TabIcon name="shield-checkmark" outline="shield-checkmark-outline" {...p} />, tabBarBadge: badge(stats.data?.pending_verifications), tabBarBadgeStyle: badgeStyle }} />
      <Tabs.Screen name="search" options={{ title: t("admin.tabs.search"), tabBarIcon: (p: IconProps) => <TabIcon name="search" outline="search-outline" {...p} /> }} />
      <Tabs.Screen name="more" options={{ title: t("admin.tabs.more"), tabBarIcon: (p: IconProps) => <TabIcon name="menu" outline="menu-outline" {...p} /> }} />
    </Tabs>
  );
}
