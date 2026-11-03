import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAllDrafts, loadDraft, saveDraft } from "../drafts";

describe("chat drafts (unsent text kept on the phone)", () => {
  beforeEach(() => AsyncStorage.clear());

  it("keeps the unsent text per chat", async () => {
    await saveDraft("c1", "Hello, is the cart still free?");
    await saveDraft("c2", "Other chat");
    expect(await loadDraft("c1")).toBe("Hello, is the cart still free?");
    expect(await loadDraft("c2")).toBe("Other chat");
    expect(await loadDraft("c3")).toBe("");
  });

  it("removes the draft once the box is empty (message sent or text deleted)", async () => {
    await saveDraft("c1", "typing…");
    await saveDraft("c1", "   ");
    expect(await loadDraft("c1")).toBe("");
  });

  it("log out removes every draft but nothing else", async () => {
    await saveDraft("c1", "a"); await saveDraft("c2", "b");
    await AsyncStorage.setItem("fmbp.locale", "hi");
    await clearAllDrafts();
    expect(await loadDraft("c1")).toBe("");
    expect(await loadDraft("c2")).toBe("");
    expect(await AsyncStorage.getItem("fmbp.locale")).toBe("hi");
  });
});
