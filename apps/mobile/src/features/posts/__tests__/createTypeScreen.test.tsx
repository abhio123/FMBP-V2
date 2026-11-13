import { fireEvent, render, screen } from "@testing-library/react-native";
import CreateType from "../../../../app/create/type";
import { recordWord } from "@/features/search/wordLog";

const mockPush = jest.fn();
const mockSetPostType = jest.fn();
const mockSetValues = jest.fn();
const mockType = (slug: string, label: string, extra: object = {}) => ({
  id: slug, slug, name_en: label, name_hi: label, plain_label_en: label, plain_label_hi: label, advanced_label_en: null, advanced_label_hi: null,
  icon: null, sort: 0, for_individuals: true, examples_en: [], examples_hi: [], keywords: "", ...extra,
});
const mockTypes = [
  mockType("need_skilled_person", "Need a Cook?", { examples_en: ["Barber & beautician"], examples_hi: ["नाई"], keywords: "hair cutter" }),
  ...Array.from({ length: 8 }, (_, i) => mockType(`t${i}`, `Choice ${i}`)),
  mockType("need_other", "Need Something Else?"),
];

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/lib/analytics", () => ({ track: jest.fn() }));
jest.mock("@/features/search/wordLog", () => ({ recordWord: jest.fn() }));
jest.mock("@/features/posts/api", () => ({ listIntentions: jest.fn(), listPostTypes: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/store/createPost", () => ({ useCreatePost: () => ({ intentionId: "need-id", setPostType: mockSetPostType, setValues: mockSetValues }) }));
jest.mock("@/store/session", () => ({ useSession: (pick: (s: unknown) => unknown) => pick({ business: { kind: "individual" } }) }));
jest.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => (queryKey[0] === "post_types"
    ? { data: mockTypes, isLoading: false, isError: false }
    : { data: [{ id: "need-id", slug: "need" }] }),
}));

// i18n is not loaded in unit tests, so labels show as their keys
describe("What do you need?", () => {
  beforeEach(() => jest.clearAllMocks());
  const search = (word: string) => fireEvent.changeText(screen.getByLabelText("create.filterTypes"), word);

  it("shows ⓘ with what a choice covers, and the dialog can pick it", async () => {
    await render(<CreateType />);
    expect(screen.getAllByRole("button", { name: "common.whatIsIncluded" })).toHaveLength(1); // only the one with examples
    await fireEvent.press(screen.getByRole("button", { name: "common.whatIsIncluded" }));
    expect(screen.getByText("Barber & beautician")).toBeTruthy();
    await fireEvent.press(screen.getByText("common.chooseThis"));
    expect(mockSetPostType).toHaveBeenCalledWith(expect.objectContaining({ slug: "need_skilled_person" }));
    expect(mockPush).toHaveBeenCalledWith("/create/details");
  });

  it("a word the choice covers finds it, is counted as found, and adds nothing to the form", async () => {
    await render(<CreateType />);
    await search("hair cutter");
    expect(screen.queryByText("Choice 1")).toBeNull();
    expect(screen.queryByText("create.notInTypes")).toBeNull();
    await fireEvent.press(screen.getByText("Need a Cook?"));
    expect(recordWord).toHaveBeenCalledWith("hair cutter", "type_list", true, "need");
    expect(mockSetValues).not.toHaveBeenCalled();
  });

  it("a word nothing covers says so, keeps Something else, and carries the word into its form", async () => {
    await render(<CreateType />);
    await search("golgappe");
    expect(screen.getByText("create.notInTypes")).toBeTruthy();
    await fireEvent.press(screen.getByText("Need Something Else?"));
    expect(recordWord).toHaveBeenCalledWith("golgappe", "type_list", false, "need");
    expect(mockSetValues).toHaveBeenCalledWith({ what: "other", what_other: "golgappe" });
    expect(mockPush).toHaveBeenCalledWith("/create/details");
  });
});

describe("What do you need? highlight", () => {
  it("marks the searched letters in the card, as on the search page", async () => {
    await render(<CreateType />);
    await fireEvent.changeText(screen.getByLabelText("create.filterTypes"), "cook");
    expect(screen.getByText("Cook")).toBeTruthy(); // its own highlighted piece of "Need a Cook?"
  });
});
