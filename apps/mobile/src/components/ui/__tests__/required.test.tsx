import { render, screen } from "@testing-library/react-native";
import { Field } from "../Field";
import { Text } from "../Text";

// i18n is not loaded in unit tests, so labels show as their keys
describe("required questions", () => {
  it("a required question shows a red '* Required' after its name (where Optional goes), read as required", async () => {
    await render(<Field label="Business name" required><Text>box</Text></Field>);
    const tag = screen.getByLabelText("common.required");
    expect(tag.props.children).toEqual(["* ", "common.requiredTag"]);
    expect([tag.props.style].flat()).toEqual(expect.arrayContaining([expect.objectContaining({ color: "#DC2626" })]));
    expect(screen.queryByText("common.optional")).toBeNull();
  });

  it("an optional question shows Optional and no Required tag", async () => {
    await render(<Field label="Website"><Text>box</Text></Field>);
    expect(screen.getByText("common.optional")).toBeTruthy();
    expect(screen.queryByLabelText("common.required")).toBeNull();
  });

  it("a setting that is not a form answer shows neither", async () => {
    await render(<Field label="Language" showOptional={false}><Text>box</Text></Field>);
    expect(screen.queryByText("common.optional")).toBeNull();
    expect(screen.queryByLabelText("common.required")).toBeNull();
  });
});
