import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAllDrafts, loadDraft, saveDraft } from "../drafts";

const text = (t: string) => ({ text: t, replyToId: null, aboutPostId: null });

describe("chat drafts (unsent message kept on the phone)", () => {
  beforeEach(() => AsyncStorage.clear());

  it("keeps the unsent text per chat", async () => {
    await saveDraft("c1", text("Hello, is the cart still free?"));
    await saveDraft("c2", text("Other chat"));
    expect((await loadDraft("c1")).text).toBe("Hello, is the cart still free?");
    expect((await loadDraft("c2")).text).toBe("Other chat");
    expect(await loadDraft("c3")).toEqual(text(""));
  });

  it("keeps the message being replied to and the post, with the text", async () => {
    await saveDraft("c1", { text: "Yes, still free", replyToId: "m42", aboutPostId: "p7" });
    expect(await loadDraft("c1")).toEqual({ text: "Yes, still free", replyToId: "m42", aboutPostId: "p7" });
  });

  it("keeps a chosen reply even before anything is typed", async () => {
    await saveDraft("c1", { text: "", replyToId: "m42", aboutPostId: null });
    expect((await loadDraft("c1")).replyToId).toBe("m42");
  });

  it("removes the draft once there is nothing to send (message sent or text deleted)", async () => {
    await saveDraft("c1", { text: "typing…", replyToId: "m42", aboutPostId: "p7" });
    await saveDraft("c1", { text: "   ", replyToId: null, aboutPostId: "p7" });
    expect(await loadDraft("c1")).toEqual(text(""));
  });

  it("reads drafts saved by the previous version (plain text)", async () => {
    await AsyncStorage.setItem("fmbp.chatDraft:c1", "Old draft");
    await AsyncStorage.setItem("fmbp.chatDraft:c2", "123");
    expect(await loadDraft("c1")).toEqual(text("Old draft"));
    expect(await loadDraft("c2")).toEqual(text("123"));
  });

  it("log out removes every draft but nothing else", async () => {
    await saveDraft("c1", text("a")); await saveDraft("c2", text("b"));
    await AsyncStorage.setItem("fmbp.locale", "hi");
    await clearAllDrafts();
    expect((await loadDraft("c1")).text).toBe("");
    expect((await loadDraft("c2")).text).toBe("");
    expect(await AsyncStorage.getItem("fmbp.locale")).toBe("hi");
  });
});
