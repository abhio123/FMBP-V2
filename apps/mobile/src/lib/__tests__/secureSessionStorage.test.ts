import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { secureSessionStorage as store } from "../secureSessionStorage";

// expo-secure-store is native: an in-memory fake with the same calls
const mockData = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: async (k: string) => mockData.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => { mockData.set(k, v); },
  deleteItemAsync: async (k: string) => { mockData.delete(k); },
}));
const secureKeys = async () => [...mockData.keys()].sort();

describe("the login is kept in the phone's secure storage", () => {
  beforeEach(async () => { await AsyncStorage.clear(); mockData.clear(); });

  it("saves a long session in pieces and reads it back whole, also in Hindi", async () => {
    const session = JSON.stringify({ access_token: "a".repeat(1500), refresh_token: "r".repeat(60), user: { name: "रवि वर्मा ".repeat(80) } });
    await store.setItem("sb-x-auth-token", session);
    expect(await store.getItem("sb-x-auth-token")).toBe(session);
    expect((await secureKeys()).length).toBeGreaterThan(3); // pieces + count
    expect(await AsyncStorage.getItem("sb-x-auth-token")).toBeNull(); // nothing in plain storage
    for (const k of await secureKeys()) expect(new TextEncoder().encode((await SecureStore.getItemAsync(k)) ?? "").length).toBeLessThanOrEqual(2048);
  });

  it("a shorter session replaces a longer one completely, and sign-out removes every piece", async () => {
    await store.setItem("k", "x".repeat(3000));
    await store.setItem("k", "short");
    expect(await store.getItem("k")).toBe("short");
    expect(await secureKeys()).toEqual(["k.0", "k.n"]);
    await store.removeItem("k");
    expect(await secureKeys()).toEqual([]);
    expect(await store.getItem("k")).toBeNull();
  });

  it("moves a login saved by an older app version out of plain storage", async () => {
    await AsyncStorage.setItem("sb-x-auth-token", "old-session");
    expect(await store.getItem("sb-x-auth-token")).toBe("old-session");
    expect(await AsyncStorage.getItem("sb-x-auth-token")).toBeNull();
    expect(await store.getItem("sb-x-auth-token")).toBe("old-session");
  });
});
