import { supabase } from "@/lib/supabase";
import { isValidIndianMobile, authErrorKey, sendOtp } from "../api";

jest.mock("@/lib/supabase", () => ({ supabase: { auth: { signInWithOtp: jest.fn(), verifyOtp: jest.fn() } } }));

describe("isValidIndianMobile", () => {
  it.each(["9876543210", "6000000000", "9999900001"])("accepts %s", (p) => expect(isValidIndianMobile(p)).toBe(true));
  it.each(["", "12345", "1234567890", "5876543210", "98765432101", "98765 43210", "+919876543210"])("rejects %s", (p) =>
    expect(isValidIndianMobile(p)).toBe(false),
  );
});

describe("authErrorKey", () => {
  it("maps provider send failures to a friendly phone message", () => {
    expect(authErrorKey({ code: "sms_send_failed", message: "Error sending confirmation OTP to provider: Twilio 20003" })).toBe(
      "auth.errors.phoneNotReachable",
    );
  });
  it("maps rate limits", () => {
    expect(authErrorKey({ code: "over_sms_send_rate_limit", message: "..." })).toBe("auth.errors.tooManyRequests");
  });
  it("maps wrong or expired OTP", () => {
    expect(authErrorKey({ code: "otp_expired", message: "Token has expired or is invalid" })).toBe("auth.errors.wrongOtp");
  });
  it("detects network failures without a code", () => {
    expect(authErrorKey({ message: "Network request failed" })).toBe("auth.errors.network");
  });
  it("falls back to generic", () => {
    expect(authErrorKey({ code: "weird", message: "?" })).toBe("auth.errors.generic");
  });
});

describe("sendOtp", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects an invalid number before calling the API", async () => {
    const res = await sendOtp("1234567890");
    expect(res?.code).toBe("validation_failed");
    expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("sends a valid number in E.164 and returns null on success", async () => {
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ error: null });
    expect(await sendOtp("9999900001")).toBeNull();
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ phone: "+919999900001" });
  });

  it("returns the API error code and message", async () => {
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ error: { code: "sms_send_failed", message: "boom" } });
    expect(await sendOtp("9876543210")).toEqual({ code: "sms_send_failed", message: "boom" });
  });
});

describe("e-mail login", () => {
  beforeEach(() => jest.clearAllMocks());
  const { isValidEmail, normalizeEmail, sendEmailOtp, verifyEmailOtp } = jest.requireActual("../api") as typeof import("../api");

  it.each(["a@b.in", "ravi.kumar+shop@gmail.com", "  Owner@Sharma-Sweets.co.in  "])("accepts %s", (e) => expect(isValidEmail(e)).toBe(true));
  it.each(["", "abc", "a@b", "a@b.c", "a b@c.in", "@c.in", "a@@c.in", `${"x".repeat(250)}@c.in`])("rejects %s", (e) =>
    expect(isValidEmail(e)).toBe(false),
  );

  it("normalizes so one address is always one account", () => {
    expect(normalizeEmail("  Owner@Shop.IN ")).toBe("owner@shop.in");
  });

  it("rejects an invalid address before calling the API", async () => {
    expect((await sendEmailOtp("not-an-email"))?.code).toBe("email_address_invalid");
    expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("sends the code to the normalized address and creates the account on first use", async () => {
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValueOnce({ error: null });
    expect(await sendEmailOtp(" Owner@Shop.IN ")).toBeNull();
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ email: "owner@shop.in", options: { shouldCreateUser: true } });
  });

  it("verifies the code as an e-mail OTP", async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValueOnce({ error: null });
    expect(await verifyEmailOtp("Owner@Shop.in", "123456")).toBeNull();
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ email: "owner@shop.in", token: "123456", type: "email" });
  });

  it("maps e-mail errors to friendly messages", () => {
    expect(authErrorKey({ code: "over_email_send_rate_limit", message: "" })).toBe("auth.errors.tooManyRequests");
    expect(authErrorKey({ code: "email_address_invalid", message: "" })).toBe("auth.errors.invalidEmail");
    expect(authErrorKey({ code: "signup_disabled", message: "" })).toBe("auth.errors.emailUnavailable");
    expect(authErrorKey({ code: "unexpected_failure", message: "Disposable e-mail addresses are not allowed" })).toBe("auth.errors.disposableEmail");
  });
});
