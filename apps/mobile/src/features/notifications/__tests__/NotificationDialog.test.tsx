import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import { NotificationDialog } from "../NotificationDialog";
import type { InboxItem } from "../api";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));

const at = "2026-11-06T10:30:00Z";
const broadcast: InboxItem = { id: "1", kind: "broadcast", title: "Diwali offer", body: "Two boosts for every friend: https://fmbp.app/offer. Happy Diwali", data: {}, read: false, created_at: at };
const reply: InboxItem = { id: "2", kind: "response", title: "New reply", body: "Rohit replied to “Visit https://evil.example”", data: { kind: "response", post_id: "p1" }, read: true, created_at: at };

// translations are not loaded in unit tests: texts show as their keys
describe("<NotificationDialog> (one notification over the list)", () => {
  it("shows the whole text; a link in a broadcast is tappable and opens in the browser", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await render(<NotificationDialog item={broadcast} onClose={() => {}} onOpen={() => {}} />);
    expect(screen.getByText("Diwali offer")).toBeTruthy();
    await fireEvent.press(screen.getByRole("link"));
    expect(open).toHaveBeenCalledWith("https://fmbp.app/offer");
    expect(screen.queryByText("inbox.openPost")).toBeNull(); // nothing else to open for a broadcast
  });

  it("links in other notifications stay plain text (user-typed text could be phishing); the button opens the post", async () => {
    const onOpen = jest.fn();
    await render(<NotificationDialog item={reply} onClose={() => {}} onOpen={onOpen} />);
    expect(screen.queryByRole("link")).toBeNull();
    await fireEvent.press(screen.getByText("inbox.openPost"));
    expect(onOpen).toHaveBeenCalledWith(reply);
  });

  it("✕ and a tap outside both close it", async () => {
    const onClose = jest.fn();
    await render(<NotificationDialog item={broadcast} onClose={onClose} onOpen={() => {}} />);
    // screen readers get only ✕ (the card is modal for them); a finger can also tap the dimmed screen behind it
    expect(screen.getAllByRole("button", { name: "common.close" }).length).toBe(1);
    const closers = screen.getAllByRole("button", { name: "common.close", includeHiddenElements: true });
    expect(closers.length).toBe(2);
    for (const c of closers) await fireEvent.press(c);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
