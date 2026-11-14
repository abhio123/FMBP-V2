import { act, fireEvent, render, screen } from "@testing-library/react-native";
import Otp from "../../../../app/(auth)/otp";
import { sendOtp } from "@/features/auth/api";

jest.mock("@/lib/analytics", () => ({ track: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useLocalSearchParams: () => ({ phone: "9876543210" }),
  Redirect: () => null,
}));
jest.mock("@/features/auth/api", () => ({
  sendOtp: jest.fn(async () => null),
  verifyOtp: jest.fn(async () => null),
  isValidIndianMobile: () => true,
  authErrorKey: () => "auth.errors.generic",
}));

// i18n is not loaded in unit tests, so labels show as their keys
describe("OTP screen: resend countdown", () => {
  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
  afterEach(() => jest.useRealTimers());

  const tick = async (seconds: number) => {
    for (let i = 0; i < seconds; i++) await act(async () => { jest.advanceTimersByTime(1000); });
  };

  it("waits 30 seconds after the first code before resend works", async () => {
    await render(<Otp />);
    expect(screen.getByText("auth.resendIn")).toBeTruthy();
    await fireEvent.press(screen.getByText("auth.resendIn"));
    expect(sendOtp).not.toHaveBeenCalled();

    await tick(29);
    expect(screen.getByText("auth.resendIn")).toBeTruthy();
    await tick(1);
    expect(screen.getByText("auth.resend")).toBeTruthy();
  });

  it("resends once, then waits again", async () => {
    await render(<Otp />);
    await tick(30);
    await act(async () => { fireEvent.press(screen.getByText("auth.resend")); });
    expect(sendOtp).toHaveBeenCalledTimes(1);
    expect(sendOtp).toHaveBeenCalledWith("9876543210");
    expect(screen.getByText("auth.resendIn")).toBeTruthy();
    expect(screen.getByText("auth.resent")).toBeTruthy();
  });

  it("also waits after a failed resend, and shows the error", async () => {
    (sendOtp as jest.Mock).mockResolvedValueOnce({ code: "over_sms_send_rate_limit", message: "rate" });
    await render(<Otp />);
    await tick(30);
    await act(async () => { fireEvent.press(screen.getByText("auth.resend")); });
    expect(screen.getByText("auth.errors.generic")).toBeTruthy();
    expect(screen.getByText("auth.resendIn")).toBeTruthy();
  });
});
