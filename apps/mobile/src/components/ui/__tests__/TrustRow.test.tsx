import { render, screen } from "@testing-library/react-native";
import { TrustRow } from "../TrustRow";

// translations are not loaded in unit tests: labels show as their keys
describe("<TrustRow> (who is posting)", () => {
  it("a business: shop icon before its category and city", async () => {
    await render(<TrustRow name="Sharma Sweets" kind="business" category="Food & Restaurant" city="Noida" />);
    expect(screen.getByText("Food & Restaurant · Noida")).toBeTruthy();
    expect(screen.getByLabelText("individual.businessBadge")).toBeTruthy();
    expect(screen.queryByLabelText("individual.badge")).toBeNull();
  });

  it("a person: person icon before their trade (own words for Other) instead of the category", async () => {
    await render(<TrustRow name="Rohit" kind="individual" trade="other" tradeOther="Bhatura maker" category="Freelance" city="Noida" />);
    expect(screen.getByText("Bhatura maker · Noida")).toBeTruthy();
    expect(screen.getByLabelText("individual.badge")).toBeTruthy();
  });

  it("no icon where the profile type is not known (e.g. a chat list row)", async () => {
    await render(<TrustRow name="Sharma Sweets" city="Noida" />);
    expect(screen.queryByLabelText("individual.businessBadge")).toBeNull();
    expect(screen.queryByLabelText("individual.badge")).toBeNull();
  });
});
