import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { track } from "@/lib/analytics";
import { useSession } from "@/store/session";
import { adminError } from "./api";
import type { ReasonRequest } from "./ReasonDialog";

/**
 * Runs admin actions: refreshes every admin list afterwards, turns server refusals into sentences, and leaves the
 * admin area if the server says this number is no longer an admin.
 */
export function useAdminAction() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [ask, setAsk] = useState<ReasonRequest | null>(null);
  const message = useCallback((e: unknown) => {
    const code = adminError(e);
    if (code === "not_admin") useSession.getState().setAdmin(false, "user");
    return code ? t(`admin.errors.${code}`) : (e as Error).message;
  }, [t]);
  /** Run now (no reason needed). Errors are shown in an alert. */
  const run = useCallback(async (name: string, fn: () => Promise<unknown>, done?: string) => {
    try {
      await fn();
      track("admin_action", { action: name });
      await qc.invalidateQueries({ queryKey: ["admin"] });
      if (done) Alert.alert(done);
    } catch (e) { Alert.alert(t("common.error"), message(e)); }
  }, [qc, t, message]);
  /** Ask for a reason first (ReasonDialog), then run. Errors are shown inside the dialog. */
  const withReason = useCallback((name: string, req: Omit<ReasonRequest, "onSubmit">, fn: (reason: string) => Promise<unknown>) => {
    setAsk({
      ...req,
      onSubmit: async (reason) => {
        try { await fn(reason); } catch (e) { throw new Error(message(e)); }
        track("admin_action", { action: name });
        await qc.invalidateQueries({ queryKey: ["admin"] });
      },
    });
  }, [qc, message]);
  return { run, withReason, ask, closeAsk: () => setAsk(null), message };
}
