import { View, Pressable, Image } from "react-native";
import * as Picker from "expo-image-picker";
import * as Manip from "expo-image-manipulator";
import { useTranslation } from "react-i18next";
import { Text } from "./Text";

/**
 * `square`: one photo, cropped square by the user (a business picture shown in a circle); same crop on iPhone and Android.
 * `width`: photos are resized to this width before upload (smaller files on mobile data).
 */
export function ImagePicker({ value, onChange, max = 3, square = false, width = 1600 }: {
  value?: string[]; onChange: (uris: string[]) => void; max?: number; square?: boolean; width?: number;
}) {
  const { t } = useTranslation();
  const pick = async () => {
    const perm = await Picker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await Picker.launchImageLibraryAsync(square
      ? { mediaTypes: ["images"], quality: 0.9, allowsEditing: true, aspect: [1, 1] }
      : { mediaTypes: ["images"], quality: 0.9, allowsMultipleSelection: true, selectionLimit: max - (value?.length ?? 0) });
    if (res.canceled) return;
    const out: string[] = [];
    for (const a of res.assets) {
      const m = await Manip.manipulateAsync(a.uri, a.width > width ? [{ resize: { width } }] : [], // never enlarge a small photo
        { compress: 0.8, format: Manip.SaveFormat.JPEG });
      out.push(m.uri);
    }
    onChange([...(value ?? []), ...out].slice(0, max));
  };
  return (
    <View className="flex-row flex-wrap gap-2">
      {(value ?? []).map((uri) => (
        <Pressable key={uri} onPress={() => onChange((value ?? []).filter((u) => u !== uri))}>
          <Image source={{ uri }} className="h-20 w-20 rounded-xl" />
        </Pressable>
      ))}
      {(value?.length ?? 0) < max && (
        <Pressable accessibilityRole="button" onPress={pick} className="h-20 w-20 items-center justify-center rounded-xl border border-dashed border-line">
          <Text className="text-2xl">＋</Text>
          <Text variant="small">{t("fields.chooseImage")}</Text>
        </Pressable>
      )}
    </View>
  );
}
