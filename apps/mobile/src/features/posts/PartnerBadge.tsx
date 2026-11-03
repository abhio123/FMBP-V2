import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui";

/** 🤝 Partner: the poster chose "Partnership (share profit)" for how they want to work. */
export function PartnerBadge({ dealType }: { dealType: string | null | undefined }) {
  const { t } = useTranslation();
  if (dealType !== "partnership") return null;
  return <Text variant="small" className="rounded-full bg-brand px-2 py-0.5 font-semibold text-white">🤝 {t("post.partnerBadge")}</Text>;
}
