import { useTranslation } from "react-i18next";
import { COLORS } from "@/theme";
import { Text } from "./Text";

/**
 * "* Required" after the name of a question that must be answered, in the same place as the "Optional" tag of the
 * others, so no legend is needed. Red so it is noticed; screen readers say "required".
 */
export function RequiredTag() {
  const { t } = useTranslation();
  return (
    <Text variant="small" accessibilityLabel={t("common.required")} style={{ color: COLORS.danger, fontWeight: "600" }}>
      * {t("common.requiredTag")}
    </Text>
  );
}
