import { View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, Card } from "@/components/ui";
import { listPostTypes } from "@/features/posts/api";
import { useCreatePost } from "@/store/createPost";
import { track } from "@/lib/analytics";

export default function CreateType() {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const { intentionId, setPostType } = useCreatePost();
  const types = useQuery({ queryKey: ["post_types", intentionId], enabled: !!intentionId, queryFn: () => listPostTypes(intentionId!) });
  return (
    <Screen>
      <Text variant="title" className="py-4">{t("create.pickType")}</Text>
      <View className="gap-2">
        {(types.data ?? []).map((p) => (
          <Card key={p.id} onPress={() => { setPostType(p); track("post_type_selected", { post_type: p.slug }); router.push("/create/details"); }}>
            <View className="flex-row items-center gap-3">
              <Text className="text-3xl">{p.icon}</Text>
              <View className="flex-1">
                <Text variant="label">{hi ? p.plain_label_hi : p.plain_label_en}</Text>
                {p.advanced_label_en ? <Text variant="small">{p.advanced_label_en}</Text> : null}
              </View>
              <Text className="text-ink-faint">›</Text>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
