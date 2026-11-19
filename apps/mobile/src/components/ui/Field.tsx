import { ReactNode } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "./Text";
import { ErrorText } from "./ErrorText";
import { RequiredTag } from "./Required";

/** Form field wrapper. After the name: "* Required" (red) on a question that must be answered, "Optional" on the others; pass `showOptional={false}` for settings (e.g. language) that are not form answers. */
export function Field({ label, help, required, children, error, showOptional = true }: { label: string; help?: string; required?: boolean; children: ReactNode; error?: string; showOptional?: boolean }) {
  const { t } = useTranslation();
  return (
    <View className="mb-5 gap-2">
      <View className="flex-row items-baseline gap-2">
        <Text variant="label">{label}</Text>
        {required ? <RequiredTag /> : showOptional ? <Text variant="small">{t("common.optional")}</Text> : null}
      </View>
      {help ? <Text variant="caption">{help}</Text> : null}
      {children}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </View>
  );
}
