import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { recordWord } from "@/features/search/wordLog";
import { TradePicker, tradeOption } from "../TradePicker";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/features/search/wordLog", () => ({ recordWord: jest.fn() }));

// i18n is not loaded in unit tests, so labels show as their keys (trades use their English name)
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const picker = (value: string | null, onChange: (v: string, o: string) => void) => (
  <SafeAreaProvider initialMetrics={metrics}><TradePicker value={value} other="" onChange={onChange} /></SafeAreaProvider>
);
const openAndSearch = async (word: string) => {
  await fireEvent.press(screen.getByRole("button", { name: "individual.trade" }));
  await fireEvent.changeText(screen.getByPlaceholderText("common.search"), word);
};

describe("TradePicker (the same list as the business categories)", () => {
  it("a trade shows its first examples under the name, all of them behind ⓘ, and search words in both languages", () => {
    const tailor = tradeOption({ value: "tailor", label: "Tailor", icon: "cut-outline" }, false, "includes:");
    expect(tailor.hint).toBe("Gents tailor (shirt, pant, suit), Ladies tailor (blouse, suit, lehenga), Kids clothes…");
    expect(tailor.info?.items).toContain("Alterations & repairs");
    expect(tailor.keywords).toContain("ब्लाउज़");
    expect(tradeOption({ value: "tailor", label: "x" }, true, "").info?.items[0]).toContain("जेंट्स");
    expect(tradeOption({ value: "other", label: "Other" }, false, "").info).toBeUndefined(); // it explains itself
  });

  it("the ⓘ shows what the work includes without picking it, and the pop-up can pick it", async () => {
    const onChange = jest.fn();
    await render(picker(null, onChange));
    await openAndSearch("tailor");
    await fireEvent.press(screen.getAllByRole("button", { name: "common.whatIsIncluded" })[0]!);
    expect(screen.getByText("Alterations & repairs")).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText("common.chooseThis"));
    expect(onChange).toHaveBeenCalledWith("tailor", "");
  });

  it("search finds a trade by what it includes, and Other is always there", async () => {
    await render(picker(null, jest.fn()));
    await openAndSearch("blouse");
    expect(screen.getByText("Tailor")).toBeTruthy();
    expect(screen.queryByText("Driver")).toBeNull();
    expect(screen.getByText("Other")).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText("common.search"), "zzzzz");
    expect(screen.getByText("Other")).toBeTruthy(); // never a dead end
  });

  it("Other opens a box for their own words", async () => {
    const onChange = jest.fn();
    const { rerender } = await render(picker(null, onChange));
    await openAndSearch("zzzzz");
    await fireEvent.press(screen.getByText("Other"));
    expect(onChange).toHaveBeenCalledWith("other", "zzzzz"); // the searched word is carried over
    await rerender(picker("other", onChange));
    await fireEvent.changeText(screen.getByPlaceholderText("individual.otherTrade"), "Bhatura maker");
    expect(onChange).toHaveBeenCalledWith("other", "Bhatura maker");
  });

  it("counts a search once it is over: found when a trade matched, not found when they fell back on Other", async () => {
    const counted = recordWord as jest.Mock;
    counted.mockClear();
    await render(picker(null, jest.fn()));
    await openAndSearch("blouse");
    expect(counted).not.toHaveBeenCalled(); // not while typing
    await fireEvent.press(screen.getByText("Tailor"));
    expect(counted).toHaveBeenLastCalledWith("blouse", "trade_list", true);
    await openAndSearch("blouse");
    await fireEvent.press(screen.getByText("Other"));
    expect(counted).toHaveBeenLastCalledWith("blouse", "trade_list", false);
    await openAndSearch("zzzzz");
    await fireEvent.press(screen.getByRole("button", { name: "common.close" }));
    expect(counted).toHaveBeenLastCalledWith("zzzzz", "trade_list", false);
    await fireEvent.press(screen.getByRole("button", { name: "individual.trade" }));
    await fireEvent.press(screen.getByRole("button", { name: "common.close" })); // opened and closed without searching
    expect(counted).toHaveBeenCalledTimes(3);
  });

  it("a word that is not in the list goes into the Other box, unless they already wrote something", async () => {
    const onChange = jest.fn();
    const { rerender } = await render(picker(null, onChange));
    await openAndSearch("Golgappe");
    await fireEvent.press(screen.getByText("Other"));
    expect(onChange).toHaveBeenLastCalledWith("other", "Golgappe");
    await rerender(<SafeAreaProvider initialMetrics={metrics}><TradePicker value={null} other="Papdi" onChange={onChange} /></SafeAreaProvider>);
    await openAndSearch("Golgappe");
    await fireEvent.press(screen.getByText("Other"));
    expect(onChange).toHaveBeenLastCalledWith("other", "Papdi");
  });
});
