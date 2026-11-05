import { adminError, clearModes, loadMode, saveMode } from "../api";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));

describe("admin helpers", () => {
  it("server refusals become known codes; anything else stays a raw message", () => {
    expect(adminError({ message: "not_admin" })).toBe("not_admin");
    expect(adminError({ message: "too_soon" })).toBe("too_soon");
    expect(adminError(new Error("network down"))).toBeNull();
    expect(adminError(null)).toBeNull();
  });

  it("the admin's choice is remembered per account and forgotten at logout", async () => {
    expect(await loadMode("u1")).toBeNull();
    await saveMode("u1", "admin");
    await saveMode("u2", "user");
    expect(await loadMode("u1")).toBe("admin");
    expect(await loadMode("u2")).toBe("user");
    await clearModes();
    expect(await loadMode("u1")).toBeNull();
    expect(await loadMode("u2")).toBeNull();
  });
});
