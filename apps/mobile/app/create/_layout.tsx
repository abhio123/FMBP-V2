import { Stack } from "expo-router";
export default function CreateLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, title: "", headerBackTitle: "" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="type" />
      <Stack.Screen name="details" />
      <Stack.Screen name="review" />
    </Stack>
  );
}
