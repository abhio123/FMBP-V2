import { useEffect } from "react";
import { Alert, Pressable } from "react-native";
import { Stack, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useTranslation } from "react-i18next";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCreatePost } from "@/store/createPost";

/** True once the user has picked a type and filled something in: closing would lose work. */
const hasDraft = (s: ReturnType<typeof useCreatePost.getState>) =>
  !!s.postType && (Object.keys(s.values).length > 0 || !!s.title || !!s.description);

/**
 * Close (✕) on every step of the Post flow, which opens as a bottom sheet. Swiping down (iPhone) or Back (Android)
 * are not obvious to everyone, so the flow can always be left with a visible button.
 */
function CloseButton() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t("create.close")} hitSlop={8} className="h-11 w-11 items-center justify-center"
      // this stack lives inside the root stack's "create" screen: going back there closes the whole sheet
      // (and goes through the discard check below, like every other way of closing)
      onPress={() => navigation.getParent()?.goBack()}>
      <Ionicons name="close" size={26} color="#111827" />
    </Pressable>
  );
}

export default function CreateLayout() {
  const { t } = useTranslation();
  // this layout is the root stack's "create" screen: guarding its removal covers ✕, swipe-down (iPhone) and Back (Android)
  const navigation = useNavigation();
  const draft = useCreatePost(hasDraft);
  usePreventRemove(draft, ({ data }) => {
    // publishing resets the draft right before leaving: never ask then
    if (!hasDraft(useCreatePost.getState())) return navigation.dispatch(data.action);
    Alert.alert(t("create.discardTitle"), t("create.discardBody"), [
      { text: t("create.keepEditing"), style: "cancel" },
      { text: t("create.discard"), style: "destructive", onPress: () => { useCreatePost.getState().reset(); navigation.dispatch(data.action); } },
    ]);
  });
  // leaving the flow any other way (nothing filled in yet) starts the next post fresh
  useEffect(() => () => useCreatePost.getState().reset(), []);

  return (
    <Stack screenOptions={{ headerShown: true, title: "", headerBackTitle: "", headerBackButtonDisplayMode: "minimal", headerRight: () => <CloseButton /> }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="type" />
      <Stack.Screen name="details" />
      <Stack.Screen name="review" />
    </Stack>
  );
}
