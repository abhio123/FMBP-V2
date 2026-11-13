import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { FormSchema, FormValues } from "@fmbp/shared";
import { recordWord } from "@/features/search/wordLog";
import { SchemaForm } from "../SchemaForm";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/features/search/wordLog", () => ({ recordWord: jest.fn() }));
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [
    { id: "id-elec", slug: "electrical_electronics", name_en: "Electrical", name_hi: "बिजली", icon: null, keywords: "bijli motor", examples_en: ["Motors & pumps"], examples_hi: ["मोटर और पंप"] },
    { id: "id-other", slug: "other", name_en: "Other category", name_hi: "अन्य", icon: null, keywords: "", examples_en: [], examples_hi: [] },
  ] }),
}));

// i18n is not loaded in unit tests, so labels show as their keys
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const option = (value: string, label: string, icon?: string) => ({ value, label_en: label, label_hi: label, icon });
const trades = Array.from({ length: 13 }, (_, i) => option(`job${i}`, `Job ${i}`));
const schema: FormSchema = {
  target: "post", type_slug: "t", version: 1, title_template: "", description_template: "",
  fields: [
    { key: "job", type: "chips", label_en: "Your work", label_hi: "काम", section: "basic", options: [...trades, option("other", "Other work")] },
    { key: "industry", type: "select", label_en: "Industry", label_hi: "उद्योग", section: "basic", options_source: "categories" },
  ],
};
const form = (values: FormValues, onChange: (v: FormValues) => void) => (
  <SafeAreaProvider initialMetrics={metrics}><SchemaForm schema={schema} values={values} onChange={onChange} /></SafeAreaProvider>
);
const search = async (list: string, word: string) => {
  await fireEvent.press(screen.getByRole("button", { name: list }));
  await fireEvent.changeText(screen.getByPlaceholderText("common.search"), word);
};

describe("post forms: a word that is not in the list", () => {
  beforeEach(() => (recordWord as jest.Mock).mockClear());

  it("says so, carries the searched word into the Other box, and counts it as not found", async () => {
    const onChange = jest.fn();
    await render(form({}, onChange));
    await search("Your work", "Golgappe");
    expect(screen.getByText("common.notInList")).toBeTruthy();
    await fireEvent.press(screen.getByText("Other work"));
    expect(onChange).toHaveBeenLastCalledWith({ job: "other", job_other: "Golgappe" });
    expect(recordWord).toHaveBeenLastCalledWith("Golgappe", "form_list", false, "t.job"); // which form and field
  });

  it("never replaces what they already wrote under Other", async () => {
    const onChange = jest.fn();
    await render(form({ job: "job1", job_other: "Papdi chaat" }, onChange));
    await search("Job 1", "golgappe");
    await fireEvent.press(screen.getByText("Other work"));
    expect(onChange).toHaveBeenLastCalledWith({ job: "other", job_other: "Papdi chaat" });
  });

  it("choosing something the list had keeps no searched word and shows no message", async () => {
    const onChange = jest.fn();
    await render(form({}, onChange));
    await search("Your work", "job 5");
    expect(screen.queryByText("common.notInList")).toBeNull();
    await fireEvent.press(screen.getByText("Job 5"));
    expect(onChange).toHaveBeenLastCalledWith({ job: "job5" });
    expect(recordWord).toHaveBeenLastCalledWith("job 5", "form_list", true, "t.job");
  });

  it("category lists work like the business one: found by what they include, with ⓘ, and counted", async () => {
    const onChange = jest.fn();
    await render(form({}, onChange));
    await search("Industry", "motor");
    expect(screen.getByRole("button", { name: "common.whatIsIncluded" })).toBeTruthy();
    await fireEvent.press(screen.getByText("Electrical"));
    expect(onChange).toHaveBeenLastCalledWith({ industry: "electrical_electronics" }); // the slug, as saved posts expect
    expect(recordWord).toHaveBeenLastCalledWith("motor", "form_list", true, "t.industry");
  });
});
