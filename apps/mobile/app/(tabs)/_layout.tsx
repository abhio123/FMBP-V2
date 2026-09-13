import { Tabs, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, type ColorValue } from "react-native";

function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 22, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#1F6F5F", headerShown: false, tabBarLabelStyle: { fontSize: 12 } }}>
      <Tabs.Screen name="feed" options={{ title: t("tabs.feed"), tabBarIcon: ({ color }) => <TabIcon glyph="✨" color={color} /> }} />
      <Tabs.Screen name="search" options={{ title: t("tabs.search"), tabBarIcon: ({ color }) => <TabIcon glyph="🔎" color={color} /> }} />
      <Tabs.Screen
        name="create"
        options={{ title: t("tabs.create"), tabBarIcon: ({ color }) => <TabIcon glyph="➕" color={color} /> }}
        // The Post tab is an action, not a screen: open the create flow every time it is tapped.
        listeners={{ tabPress: (e) => { e.preventDefault(); router.push("/create"); } }}
      />
      <Tabs.Screen name="chat" options={{ title: t("tabs.chat"), tabBarIcon: ({ color }) => <TabIcon glyph="💬" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t("tabs.profile"), tabBarIcon: ({ color }) => <TabIcon glyph="🏪" color={color} /> }} />
    </Tabs>
  );
}
