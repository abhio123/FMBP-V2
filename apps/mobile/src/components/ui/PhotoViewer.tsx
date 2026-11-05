import { useState } from "react";
import { FlatList, Image, Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "./Text";
import { Icon } from "./Icon";

/**
 * Photos opened over the screen (like the language dialog): dark backdrop, the photo whole and centred, swipe between
 * photos with "2 / 5", ✕ to close. Tapping the backdrop or Back also closes it. Visible while `index` is set.
 */
export function PhotoViewer({ urls, index, onClose }: { urls: string[]; index: number | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const visible = index != null && urls.length > 0;
  const start = Math.min(Math.max(index ?? 0, 0), Math.max(urls.length - 1, 0));
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}
      onShow={() => setCurrent(start)}>
      <View style={styles.backdrop}>
        {visible ? (
          <FlatList
            data={urls}
            keyExtractor={(u, i) => `${i}:${u}`}
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            initialScrollIndex={start}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item, index: i }) => (
              // the page is backdrop (tap closes); the photo itself is not
              <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={onClose} style={[styles.page, { width }]}>
                <Pressable onPress={() => {}} accessibilityLabel={t("common.photoOf", { n: i + 1, total: urls.length })}>
                  <Image source={{ uri: item }} resizeMode="contain" accessibilityIgnoresInvertColors
                    style={{ width: width - 32, height: Math.round(height * 0.72) }} />
                </Pressable>
              </Pressable>
            )}
          />
        ) : null}
        <View pointerEvents="box-none" style={[styles.bar, { top: insets.top + 8 }]}>
          {urls.length > 1 ? <Text style={styles.count}>{current + 1} / {urls.length}</Text> : <View />}
          <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={onClose} hitSlop={8} style={styles.close}>
            <Icon name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)" },
  page: { flex: 1, alignItems: "center", justifyContent: "center" },
  bar: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  count: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  closeText: { color: "#FFFFFF", fontSize: 20, lineHeight: 24 },
});
