import { Tabs, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ColorValue } from "react-native";
import { listConversations, unreadConversationCount } from "@/features/chat/api";
import { useSession } from "@/store/session";

type IconName = keyof typeof Ionicons.glyphMap;
type IconProps = { focused: boolean; color: ColorValue; size: number };

/** Icon matches the tab label (house = Home, storefront = Business). Filled when selected, outline otherwise. */
function TabIcon({ name, outline, focused, color, size }: IconProps & { name: IconName; outline: IconName }) {
  // tab tints are hex strings (tabBarActiveTintColor / default inactive grey), which is what Ionicons accepts
  return <Ionicons name={focused ? name : outline} size={size} color={color as string} />;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const business = useSession((s) => s.business);
  // same query key as the Chats tab, so both stay in sync; polled so the badge works without realtime
  const convs = useQuery({ queryKey: ["conversations", business?.id], enabled: !!business, queryFn: () => listConversations(business!.id), refetchInterval: 20_000, refetchIntervalInBackground: false });
  const unread = business && convs.data ? unreadConversationCount(convs.data, business.id) : 0;
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#1F6F5F", headerShown: false, tabBarLabelStyle: { fontSize: 12 } }}>
      <Tabs.Screen name="feed" options={{ title: t("tabs.feed"), tabBarIcon: (p: IconProps) => <TabIcon name="home" outline="home-outline" {...p} /> }} />
      <Tabs.Screen name="search" options={{ title: t("tabs.search"), tabBarIcon: (p: IconProps) => <TabIcon name="search" outline="search-outline" {...p} /> }} />
      <Tabs.Screen
        name="create"
        options={{ title: t("tabs.create"), tabBarIcon: (p: IconProps) => <TabIcon name="add-circle" outline="add-circle-outline" {...p} /> }}
        // The Post tab is an action, not a screen: open the create flow every time it is tapped.
        listeners={{ tabPress: (e) => { e.preventDefault(); router.push("/create"); } }}
      />
      <Tabs.Screen name="chat" options={{ title: t("tabs.chat"), tabBarIcon: (p: IconProps) => <TabIcon name="chatbubbles" outline="chatbubbles-outline" {...p} />, tabBarBadge: unread > 0 ? unread : undefined, tabBarBadgeStyle: { backgroundColor: "#F59E0B", color: "#111827", fontSize: 11 } }} />
      <Tabs.Screen name="profile" options={{ title: t("tabs.profile"), tabBarIcon: (p: IconProps) => <TabIcon name="storefront" outline="storefront-outline" {...p} /> }} />
    </Tabs>
  );
}
