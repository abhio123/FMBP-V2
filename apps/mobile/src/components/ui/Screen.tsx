import { ReactNode } from "react";
import { ScrollView, View, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Page shell. `scroll` wraps children in a ScrollView; otherwise the child (usually a FlatList)
 * gets a flex-1 box so it can scroll itself. Keyboard avoidance uses "padding" on both platforms:
 * Android is edge-to-edge in this SDK, so the window no longer resizes for the keyboard by itself.
 */
export function Screen({ children, scroll = true, padded = true }: { children: ReactNode; scroll?: boolean; padded?: boolean }) {
  const pad = padded ? "px-4 pb-8 pt-2" : "";
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView className="flex-1" behavior="padding">
        {scroll ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="flex-grow">
            <View className={pad}>{children}</View>
          </ScrollView>
        ) : (
          <View className={`flex-1 ${padded ? "px-4 pt-2" : ""}`}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
