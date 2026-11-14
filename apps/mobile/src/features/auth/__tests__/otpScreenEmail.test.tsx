import { act, fireEvent, render, screen } from "@testing-library/react-native";
import Otp from "../../../../app/(auth)/otp";
import { sendEmailOtp, sendOtp, verifyEmailOtp, verifyOtp } from "@/features/auth/api";

jest.mock("@/lib/analytics", () => ({ track: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useLocalSearchParams: () => ({ email: "owner@shop.in" }),
  Redirect: () => null,
}));
jest.mock("@/features/auth/api", () => ({
  sendOtp: jest.fn(async () => null),
  verifyOtp: jest.fn(async () => null),
  sendEmailOtp: jest.fn(async () => null),
  verifyEmailOtp: jest.fn(async () => null),
  isValidIndianMobile: () => false,
  isValidEmail: () => true,
  authErrorKey: () => "auth.errors.generic",
}));

// i18n is not loaded in unit tests, so labels show as their keys
describe("OTP screen: login by e-mail", () => {
  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
  afterEach(() => jest.useRealTimers());

  it("says the code went to the e-mail and offers to change the e-mail", async () => {
    await render(<Otp />);
    expect(screen.getByText("auth.otpSentEmail")).toBeTruthy();
    expect(screen.getByText("auth.changeEmail")).toBeTruthy();
  });

  it("verifies the code as an e-mail code, never as a phone code", async () => {
    await render(<Otp />);
    await act(async () => { fireEvent.changeText(screen.getByLabelText("auth.otpTitle"), "482913"); });
    await act(async () => { fireEvent.press(screen.getByText("auth.verify")); });
    expect(verifyEmailOtp).toHaveBeenCalledWith("owner@shop.in", "482913");
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("resends by e-mail after the countdown", async () => {
    await render(<Otp />);
    for (let i = 0; i < 30; i++) await act(async () => { jest.advanceTimersByTime(1000); });
    await act(async () => { fireEvent.press(screen.getByText("auth.resend")); });
    expect(sendEmailOtp).toHaveBeenCalledWith("owner@shop.in");
    expect(sendOtp).not.toHaveBeenCalled();
  });
});
