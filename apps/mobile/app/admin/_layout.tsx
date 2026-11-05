import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ADMIN_HEADER } from "@/features/admin/theme";

/** Admin area (ADMIN.md): tabs plus detail screens. Opened only in admin mode (root layout). */
export default function AdminLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ ...ADMIN_HEADER, headerBackButtonDisplayMode: "minimal", headerBackTitle: "" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="business/[id]" options={{ title: t("admin.business") }} />
      <Stack.Screen name="broadcast" options={{ title: t("admin.broadcast") }} />
      <Stack.Screen name="settings" options={{ title: t("admin.settings") }} />
      <Stack.Screen name="admins" options={{ title: t("admin.admins") }} />
      <Stack.Screen name="log" options={{ title: t("admin.log") }} />
      <Stack.Screen name="list" options={{ title: "" }} />
    </Stack>
  );
}
