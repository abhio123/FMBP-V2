import { BRAND } from "@fmbp/shared";

// The brand settings for app code. Colours: apps/mobile/brand.config.js. The name: packages/shared/src/brand.ts.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const brand = require("../../brand.config.js") as { colors: Record<ColorName, string> };

export type ColorName =
  | "brand" | "brandLight" | "brandDark" | "accent" | "ink" | "inkMuted" | "inkFaint" | "line" | "surface" | "surfaceMuted" | "white" | "shadow"
  | "success" | "danger" | "dangerDark" | "whatsapp" | "overlay" | "overlayLight" | "photoBackdrop" | "onDarkMuted" | "onDarkButton";

export const COLORS: Readonly<Record<ColorName, string>> = brand.colors;
export const APP_NAME: string = BRAND.appName;
