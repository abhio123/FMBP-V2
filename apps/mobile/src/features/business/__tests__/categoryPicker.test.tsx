import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Select } from "@/components/ui";
import { CategoryPicker, categoryOptions } from "../CategoryPicker";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/features/search/wordLog", () => ({ recordWord: jest.fn() }));
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [
    { id: "food", slug: "food", name_en: "Food", name_hi: "खाना", icon: null, keywords: "", examples_en: [], examples_hi: [] },
    { id: "oth", slug: "other", name_en: "Other", name_hi: "अन्य", icon: null, keywords: "", examples_en: [], examples_hi: [] },
  ] }),
}));

const cat = (id: string, name: string, examples: string[], keywords: string) => ({
  id, slug: id, name_en: name, name_hi: `${name} HI`, icon: null, sort: 1, keywords, examples_en: examples, examples_hi: examples.map((e) => `${e} HI`),
});
const cats = [
  cat("food", "Food & Restaurant", ["Restaurant / dhaba", "Sweet shop / halwai"], "dhaba mithai"),
  cat("elec", "Electrical & Electronics", ["Wires, switches & fittings", "LED, bulbs & lights", "Fans & coolers", "Motors & pumps", "TV & remote"], "bijli led motor pankha tv"),
  ...Array.from({ length: 6 }, (_, i) => cat(`c${i}`, `Category ${i}`, [`Thing ${i}`], "")),
];
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

describe("category picker (broad categories with what belongs in each)", () => {
  it("each category: first examples under the name, all of them behind ⓘ, search words from the examples", () => {
    const [, elec] = categoryOptions(cats, false, "includes:");
    expect(elec.hint).toBe("Wires, switches & fittings, LED, bulbs & lights, Fans & coolers…");
    expect(elec.info?.items).toHaveLength(5);
    expect(categoryOptions(cats, true, "x")[1].info?.items[0]).toBe("Wires, switches & fittings HI"); // Hindi examples
  });

  it("ⓘ opens what belongs in it, and Choose this picks it; search by motor or bijli finds it", async () => {
    const onChange = jest.fn();
    await render(<SafeAreaProvider initialMetrics={metrics}>
      <Select options={categoryOptions(cats, false, "includes:")} value={null} onChange={onChange} placeholder="What kind of business?" />
    </SafeAreaProvider>);
    await fireEvent.press(screen.getByText("What kind of business?"));
    // translations are not loaded in unit tests: labels show as their keys
    const infos = screen.getAllByRole("button", { name: "common.whatIsIncluded" });
    await fireEvent.press(infos[1]);
    expect(screen.getByText("Motors & pumps")).toBeTruthy();
    await fireEvent.press(screen.getByText("common.chooseThis"));
    expect(onChange).toHaveBeenCalledWith("elec");
    await fireEvent.press(screen.getByText("What kind of business?"));
    for (const word of ["motor", "bijli", "LED"]) {
      await fireEvent.changeText(screen.getByPlaceholderText("common.search"), word);
      expect(screen.getByText("Electrical & Electronics")).toBeTruthy();
      expect(screen.queryByText("Food & Restaurant")).toBeNull();
    }
  });

  it("Other opens a box for their own words, and only Other does; search never hides it", async () => {
    const onOther = jest.fn();
    const tree = (value: string | null) => (
      <SafeAreaProvider initialMetrics={metrics}><CategoryPicker placeholder="Category" value={value} onChange={jest.fn()} other="" onOtherChange={onOther} /></SafeAreaProvider>
    );
    const { rerender } = await render(tree("food"));
    expect(screen.queryByPlaceholderText("businessType.otherPlaceholder")).toBeNull();
    await rerender(tree("oth"));
    await fireEvent.changeText(screen.getByPlaceholderText("businessType.otherPlaceholder"), "Bamboo baskets");
    expect(onOther).toHaveBeenCalledWith("Bamboo baskets");
    await fireEvent.changeText(screen.getByPlaceholderText("businessType.otherPlaceholder"), "x".repeat(60));
    expect(onOther).toHaveBeenLastCalledWith("x".repeat(40)); // the server's limit
    await rerender(tree(null));
    await fireEvent.press(screen.getByRole("button", { name: "Category" }));
    await fireEvent.changeText(screen.getByPlaceholderText("common.search"), "zzzzz");
    expect(screen.getByText("Other")).toBeTruthy();
  });
});
