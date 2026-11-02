import { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useHeaderInset } from "./useHeaderInset";

/**
 * Page shell. `scroll` pages use KeyboardAwareScrollView (keeps the focused input above the keyboard on
 * Android edge-to-edge and never leaves stale padding after the screen sleeps). Non-scroll pages get a
 * flex-1 box so a FlatList inside can scroll itself.
 */
export function Screen({ children, scroll = true, padded = true }: { children: ReactNode; scroll?: boolean; padded?: boolean }) {
  const pad = padded ? "px-4 pb-8 pt-2" : "";
  const header = useHeaderInset();
  // Non-scroll pages under a native header take their top inset from the measured header overlap (see useHeaderInset);
  // the safe-area top edge would only cover the status bar and leave the first rows behind the header on iOS 26.
  const headerInsetted = !scroll && header.headerShown;
  return (
    <View onLayout={header.onLayout} className="flex-1 bg-surface">
      <SafeAreaView className="flex-1" edges={headerInsetted ? ["left", "right"] : ["top", "left", "right"]}>
        {scroll ? (
          // contentInsetAdjustmentBehavior (iOS only): newer iOS draws a translucent navigation header over the page;
          // "automatic" insets the content below it (and above the home indicator) instead of hiding it behind the header.
          <KeyboardAwareScrollView bottomOffset={32} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1 }}>
            {/* flex-grow: fill the viewport so pages can centre content (`flex-grow justify-center`) and still
                scroll when it is taller than the screen. Never use flex-1 there: it lets the box shrink below its
                content, and centred overflow ends up above the scroll origin (unreachable; iOS clips the text). */}
            <View className={`flex-grow ${pad}`}>{children}</View>
          </KeyboardAwareScrollView>
        ) : (
          <View className={`flex-1 ${padded ? "px-4 pt-2" : ""}`} style={headerInsetted ? { paddingTop: header.inset + (padded ? 8 : 0) } : undefined}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}
