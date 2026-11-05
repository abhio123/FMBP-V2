import { useState } from "react";
import { Alert, Linking } from "react-native";
import { useTranslation } from "react-i18next";
import { PhotoViewer } from "@/components/ui";
import { verificationDocUrl } from "./api";

/** Opens a verification document from the private bucket through a 5-minute link: photos in the viewer, PDFs outside. */
export function useDocViewer() {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const open = async (path: string | null) => {
    if (!path) return;
    try {
      const signed = await verificationDocUrl(path);
      if (path.toLowerCase().endsWith(".pdf")) await Linking.openURL(signed);
      else setUrl(signed);
    } catch (e) { Alert.alert(t("common.error"), (e as Error).message); }
  };
  const viewer = <PhotoViewer urls={url ? [url] : []} index={url ? 0 : null} onClose={() => setUrl(null)} />;
  return { open, viewer };
}
