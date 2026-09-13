import { useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import { INDIAN_CITIES, type LocationValue } from "@fmbp/shared";
import { Text } from "./Text";
import { Card } from "./Card";
import { Select } from "./Select";

/**
 * Tap-first location: device GPS + reverse geocode, with a city list as the never-block fallback
 * (permission denied, no GPS, emulator). Places autocomplete lands with the search work.
 */
export function LocationPicker({ value, onChange }: { value?: LocationValue | null; onChange: (v: LocationValue) => void }) {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const useCurrent = async () => {
    setBusy(true); setErr(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setErr(t("fields.locationDenied")); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [g] = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      onChange({
        lat: pos.coords.latitude, lng: pos.coords.longitude,
        city: g?.city ?? g?.subregion ?? g?.region ?? "", state: g?.region ?? undefined,
        pincode: g?.postalCode ?? undefined, country: g?.isoCountryCode ?? "IN",
        label: [g?.name, g?.city ?? g?.subregion, g?.region].filter(Boolean).join(", "),
      });
    } catch { setErr(t("fields.locationFailed")); } finally { setBusy(false); }
  };

  const pickCity = (city: string) => {
    const c = INDIAN_CITIES.find((x) => x.city === city);
    if (c) onChange({ lat: c.lat, lng: c.lng, city: c.city, state: c.state, country: "IN", label: hi ? c.name_hi : c.city });
  };
  const selectedCity = value && INDIAN_CITIES.some((c) => c.city === value.city && Math.abs(c.lat - value.lat) < 0.01) ? value.city : null;

  return (
    <View className="gap-2">
      {value ? (
        <Card selected>
          <Text variant="label">📍 {value.label || value.city}</Text>
          {value.pincode ? <Text variant="caption">{value.pincode}</Text> : null}
        </Card>
      ) : null}
      <Pressable accessibilityRole="button" onPress={useCurrent} disabled={busy} className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl border border-brand px-4">
        {busy ? <ActivityIndicator color="#1F6F5F" /> : <Text className="text-brand">🎯</Text>}
        <Text className="font-medium text-brand">{value ? t("fields.pickLocation") : t("fields.useCurrent")}</Text>
      </Pressable>
      {err ? <Text variant="caption" className="text-danger">{err}</Text> : null}
      <Text variant="caption">{t("fields.pickCity")}</Text>
      <Select
        placeholder={t("fields.cityPlaceholder")}
        value={selectedCity}
        onChange={pickCity}
        options={INDIAN_CITIES.map((c) => ({ value: c.city, label: hi ? c.name_hi : c.city }))}
      />
    </View>
  );
}
