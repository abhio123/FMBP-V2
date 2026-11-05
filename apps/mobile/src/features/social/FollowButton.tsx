import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui";
import { useFollowingIds, useToggleFollow } from "./api";

/**
 * Follow / Following toggle for another business. Secondary style in both states so it never competes with the
 * page's main action (e.g. "Let's talk"); the label carries the state.
 */
export function FollowButton({ businessId }: { businessId: string }) {
  const { t } = useTranslation();
  const following = useFollowingIds();
  const toggle = useToggleFollow();
  const isFollowing = following.data?.has(businessId) ?? false;
  return (
    <Button title={isFollowing ? t("post.following") : t("post.follow")} icon={isFollowing ? "checkmark" : "add"} variant="secondary" full={false}
      onPress={() => toggle.mutate({ targetId: businessId, following: isFollowing })} />
  );
}
