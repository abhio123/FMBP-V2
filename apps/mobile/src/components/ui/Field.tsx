import { ReactNode } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "./Text";

export function Field({ label, help, required, children, error }: { label: string; help?: string; required?: boolean; children: ReactNode; error?: string }) {
  const { t } = useTranslation();
  return (
    <View className="mb-5 gap-2">
      <View className="flex-row items-baseline gap-2">
        <Text variant="label">{label}</Text>
        {!required ? <Text variant="small">{t("common.optional")}</Text> : null}
      </View>
      {help ? <Text variant="caption">{help}</Text> : null}
      {children}
      {error ? <Text variant="caption" className="text-danger">{error}</Text> : null}
    </View>
  );
}
