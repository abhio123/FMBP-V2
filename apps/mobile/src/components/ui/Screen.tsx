import { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

/**
 * Page shell. `scroll` pages use KeyboardAwareScrollView (keeps the focused input above the keyboard on
 * Android edge-to-edge and never leaves stale padding after the screen sleeps). Non-scroll pages get a
 * flex-1 box so a FlatList inside can scroll itself.
 */
export function Screen({ children, scroll = true, padded = true }: { children: ReactNode; scroll?: boolean; padded?: boolean }) {
  const pad = padded ? "px-4 pb-8 pt-2" : "";
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "left", "right"]}>
      {scroll ? (
        <KeyboardAwareScrollView bottomOffset={32} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
          <View className={pad}>{children}</View>
        </KeyboardAwareScrollView>
      ) : (
        <View className={`flex-1 ${padded ? "px-4 pt-2" : ""}`}>{children}</View>
      )}
    </SafeAreaView>
  );
}
