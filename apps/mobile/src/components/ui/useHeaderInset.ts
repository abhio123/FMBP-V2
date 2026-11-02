import { useCallback, useContext, useState } from "react";
import { Platform, type LayoutChangeEvent } from "react-native";
import { HeaderHeightContext, HeaderShownContext } from "expo-router/react-navigation";

/**
 * Top padding a non-scrolling page needs to start below the native stack header.
 *
 * On iOS 26 the native stack lays every screen out *under* the navigation bar (react-native-screens), so a page
 * that is not a scroll view (scroll views use contentInsetAdjustmentBehavior) would draw its first rows behind the
 * header and back button. Rather than assume, measure: the inset is how far the header reaches below the top of
 * the page. Android and older iOS lay the page out below the header, so it measures 0 there (no double padding).
 *
 * Pass `onLayout` to the page's outermost view.
 */
export function useHeaderInset() {
  const headerShown = useContext(HeaderShownContext);
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const [pageTop, setPageTop] = useState<number | null>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const page = e.currentTarget;
    if (typeof page !== "number") page.measureInWindow((_x, y) => setPageTop(y));
  }, []);
  const inset = Platform.OS === "ios" && headerShown && pageTop !== null ? Math.max(0, headerHeight - pageTop) : 0;
  return { headerShown, onLayout, inset };
}
