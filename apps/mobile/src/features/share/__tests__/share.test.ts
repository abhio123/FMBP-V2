import { Linking, Platform, Share } from "react-native";
import { shareToWhatsApp } from "../share";

const MESSAGE = "*Selling Machine (used)*\nJalebi machine!\n\n👉 View on FMBP: https://fmbp.app/post/abc";

describe("shareToWhatsApp", () => {
  const original = Platform.OS;
  // jest-expo already mocks Linking.openURL, so spyOn returns that same mock: reset its calls and queued results
  beforeEach(() => jest.spyOn(Linking, "openURL").mockReset());
  afterEach(() => { jest.restoreAllMocks(); Object.defineProperty(Platform, "OS", { value: original }); });
  const onPlatform = (os: "ios" | "android") => Object.defineProperty(Platform, "OS", { value: os });

  it("iPhone: opens WhatsApp's own scheme with the full, strictly encoded message", async () => {
    onPlatform("ios");
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const unavailable = jest.fn();
    await shareToWhatsApp(MESSAGE, unavailable);
    expect(open).toHaveBeenCalledTimes(1);
    const url = open.mock.calls[0][0];
    expect(url.startsWith("whatsapp://send?text=")).toBe(true);
    expect(url).not.toMatch(/[*!'()\s]/); // nothing iOS could reject
    expect(decodeURIComponent(url.slice("whatsapp://send?text=".length))).toBe(MESSAGE); // details + link intact
    expect(unavailable).not.toHaveBeenCalled();
  });

  it("iPhone: falls back to wa.me, and never silently to the share sheet", async () => {
    onPlatform("ios");
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const open = jest.spyOn(Linking, "openURL").mockRejectedValueOnce(new Error("no app")).mockResolvedValueOnce(undefined);
    const sheet = jest.spyOn(Share, "share");
    await shareToWhatsApp(MESSAGE, jest.fn());
    expect(open.mock.calls[1][0].startsWith("https://wa.me/?text=")).toBe(true);
    expect(sheet).not.toHaveBeenCalled();
  });

  it("tells the caller when WhatsApp can't be opened at all", async () => {
    onPlatform("ios");
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no app"));
    const sheet = jest.spyOn(Share, "share");
    const unavailable = jest.fn();
    await shareToWhatsApp(MESSAGE, unavailable);
    expect(unavailable).toHaveBeenCalledTimes(1);
    expect(sheet).not.toHaveBeenCalled();
  });

  it("Android: uses wa.me (unchanged)", async () => {
    onPlatform("android");
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await shareToWhatsApp(MESSAGE, jest.fn());
    expect(open.mock.calls[0][0].startsWith("https://wa.me/?text=")).toBe(true);
  });
});
