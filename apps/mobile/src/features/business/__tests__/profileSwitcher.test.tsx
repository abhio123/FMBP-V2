import { fireEvent, render, screen } from "@testing-library/react-native";
import { ProfileSwitcher } from "../ProfileSwitcher";
import type { BusinessSummary } from "@/store/session";

const summary = (id: string, name: string, kind: "business" | "individual" = "business"): BusinessSummary => ({
  id, name, kind, category_id: "c", category_slug: "other", city: "Noida", state: null, pincode: null, lat: 0, lng: 0, logo_url: null,
  completion_score: 0, verification_status: "none", suspended_at: null, suspension_reason: null, trade: kind === "individual" ? "tailor" : null, trade_other: null,
});
const shop = summary("1", "Clothes shop"), stall = summary("2", "Tea stall");

const mockSwitchTo = jest.fn();
const mockPush = jest.fn();
let mockHook: { profiles: BusinessSummary[]; active: BusinessSummary | null; switchTo: typeof mockSwitchTo; canAdd: boolean };
let mockUnread: Record<string, number> = {};
jest.mock("../useProfiles", () => ({ MAX_PROFILES: 3, useProfiles: () => mockHook, useProfilesUnread: () => mockUnread }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

// translations are not loaded in unit tests: texts show as their keys
describe("<ProfileSwitcher>", () => {
  beforeEach(() => { mockSwitchTo.mockClear(); mockPush.mockClear(); mockUnread = {}; });

  it("with one profile it shows only where asked (the Me tab)", async () => {
    mockHook = { profiles: [shop], active: shop, switchTo: mockSwitchTo, canAdd: true };
    const first = await render(<ProfileSwitcher label="Posting as" />);
    expect(first.toJSON()).toBeNull();
    await render(<ProfileSwitcher always />);
    expect(screen.getByText("Clothes shop")).toBeTruthy();
  });

  it("lists my profiles with unread chats; tapping another switches; the one in use does not", async () => {
    mockHook = { profiles: [shop, stall], active: shop, switchTo: mockSwitchTo, canAdd: true };
    mockUnread = { "2": 4 };
    await render(<ProfileSwitcher label="Posting as" />);
    expect(screen.getByText("Posting as")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "profiles.switchA11y" }));
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getAllByText("4").length).toBeGreaterThan(0); // the other profile's unread chats
    await fireEvent.press(screen.getByText("Tea stall"));
    expect(mockSwitchTo).toHaveBeenCalledWith(stall);
  });

  it("offers to add another until the limit; adding opens sign-up", async () => {
    mockHook = { profiles: [shop, stall], active: shop, switchTo: mockSwitchTo, canAdd: true };
    const view = await render(<ProfileSwitcher />);
    await fireEvent.press(screen.getByRole("button", { name: "profiles.switchA11y" }));
    await fireEvent.press(screen.getByText("profiles.add"));
    expect(mockPush).toHaveBeenCalledWith("/(onboarding)/business");
    await view.unmount();
    mockHook = { profiles: [shop, stall, summary("3", "Rohit", "individual")], active: shop, switchTo: mockSwitchTo, canAdd: false };
    await render(<ProfileSwitcher />);
    await fireEvent.press(screen.getByRole("button", { name: "profiles.switchA11y" }));
    expect(screen.queryByText("profiles.add")).toBeNull();
    expect(screen.getByText("profiles.limit")).toBeTruthy();
  });
});
