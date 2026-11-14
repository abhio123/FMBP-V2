import { describe, expect, it } from "vitest";
import { isIndianMobile, missingMsg91Settings, parseMsg91Response } from "../sms.ts";

describe("isIndianMobile", () => {
  it("accepts Indian mobiles with or without +", () => {
    expect(isIndianMobile("919876543210")).toBe(true);
    expect(isIndianMobile("+916123456789")).toBe(true);
  });

  it("refuses foreign numbers, landline-style starts and wrong lengths", () => {
    expect(isIndianMobile("447911123456")).toBe(false); // UK
    expect(isIndianMobile("15551234567")).toBe(false); // US
    expect(isIndianMobile("911234567890")).toBe(false); // starts with 1
    expect(isIndianMobile("91987654321")).toBe(false); // 9 digits
    expect(isIndianMobile("9198765432100")).toBe(false); // 11 digits
    expect(isIndianMobile("")).toBe(false);
  });
});

describe("parseMsg91Response", () => {
  it("accepts a success response", () => {
    expect(parseMsg91Response(200, '{"type":"success","message":"3463706b6c7a"}')).toEqual({ ok: true });
  });

  it("treats an HTTP 200 with type error as a failure (wrong key, DLT template, balance)", () => {
    expect(parseMsg91Response(200, '{"type":"error","message":"Authentication failure"}')).toEqual({ ok: false, reason: "Authentication failure" });
  });

  it("fails on a non-2xx status", () => {
    expect(parseMsg91Response(401, '{"type":"error","message":"Unauthorized"}')).toEqual({ ok: false, reason: "HTTP 401: Unauthorized" });
  });

  it("fails on a body that is not JSON or has no type", () => {
    expect(parseMsg91Response(200, "<html>gateway</html>").ok).toBe(false);
    expect(parseMsg91Response(200, "{}").ok).toBe(false);
  });

  it("keeps the reason short for logs", () => {
    const r = parseMsg91Response(500, "x".repeat(1000));
    expect(r.ok === false && r.reason.length).toBeLessThan(220);
  });
});

describe("missingMsg91Settings", () => {
  it("lists missing or blank settings", () => {
    expect(missingMsg91Settings({})).toEqual(["MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID"]);
    expect(missingMsg91Settings({ MSG91_AUTH_KEY: "k", MSG91_TEMPLATE_ID: "  " })).toEqual(["MSG91_TEMPLATE_ID"]);
    expect(missingMsg91Settings({ MSG91_AUTH_KEY: "k", MSG91_TEMPLATE_ID: "t" })).toEqual([]);
  });
});
