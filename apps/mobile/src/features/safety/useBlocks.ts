import { Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSession } from "@/store/session";
import { blockBusiness, listBlocked, unblockBusiness } from "./api";

/** Businesses I blocked (ids for quick checks, and the list for the Blocked businesses screen). */
export function useMyBlocks() {
  const business = useSession((s) => s.business);
  const q = useQuery({ queryKey: ["my_blocks", business?.id], enabled: !!business, queryFn: () => listBlocked(business!.id) });
  return { ...q, ids: new Set((q.data ?? []).map((b) => b.id)) };
}

/** Block (after a confirmation) and unblock; refreshes everything a block changes (feed, search, chats). */
export function useBlockActions() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const business = useSession((s) => s.business);
  const refresh = () => Promise.all(["my_blocks", "feed", "search", "post", "business_posts", "conversations"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
  const block = useMutation({ mutationFn: (otherId: string) => blockBusiness(business!.id, otherId), onSuccess: refresh });
  const unblock = useMutation({ mutationFn: (otherId: string) => unblockBusiness(business!.id, otherId), onSuccess: refresh });
  const confirmBlock = (otherId: string, name: string, onDone?: () => void) => {
    if (!business) return;
    Alert.alert(t("safety.blockTitle", { name }), t("safety.blockBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("safety.block"), style: "destructive", onPress: () => block.mutate(otherId, { onSuccess: () => onDone?.() }) },
    ]);
  };
  return { confirmBlock, unblock: (otherId: string) => unblock.mutate(otherId), busy: block.isPending || unblock.isPending, error: block.error ?? unblock.error };
}
