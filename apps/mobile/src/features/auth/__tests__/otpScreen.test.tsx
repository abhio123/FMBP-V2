import { fireEvent, render, screen } from "@testing-library/react-native";
import Otp from "../../../../app/(auth)/otp";
import { verifyOtp } from "@/features/auth/api";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/lib/analytics", () => ({ track: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useLocalSearchParams: () => ({ phone: "9876543210" }),
  Redirect: () => null,
}));
jest.mock("@/features/auth/api", () => ({
  verifyOtp: jest.fn(async () => null),
  sendOtp: jest.fn(async () => null),
  isValidIndianMobile: () => true,
  authErrorKey: () => "auth.invalidOtp",
}));

// i18n is not loaded in unit tests, so labels show as their keys
describe("OTP screen", () => {
  beforeEach(() => (verifyOtp as jest.Mock).mockClear());
  const box = () => screen.getByLabelText("auth.otpTitle");

  it("lets the phone offer the code from the SMS (iPhone and Android)", async () => {
    await render(<Otp />);
    expect(box().props).toMatchObject({ textContentType: "oneTimeCode", autoComplete: "sms-otp", keyboardType: "number-pad" });
  });

  it("checks the code as soon as all 6 digits arrive (suggested or pasted), without another tap", async () => {
    await render(<Otp />);
    await fireEvent.changeText(box(), "Your code: 123 456");
    expect(verifyOtp).toHaveBeenCalledWith("9876543210", "123456");
  });

  it("does not check a code that is not complete", async () => {
    await render(<Otp />);
    await fireEvent.changeText(box(), "12345");
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});
