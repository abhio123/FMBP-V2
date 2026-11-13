import { COLORS } from "@/theme";
// Dark header = always clear that this is the admin area, not the normal app (colours: tailwind ink / white).
export const ADMIN_HEADER = { headerStyle: { backgroundColor: COLORS.ink }, headerTintColor: COLORS.white, headerTitleStyle: { color: COLORS.white } } as const;
