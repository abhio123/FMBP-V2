import { fireEvent, render, screen } from "@testing-library/react-native";
import { Avatar, initials } from "../Avatar";

describe("<Avatar> (business picture)", () => {
  it("initials: first letters of the first two words, in any script", () => {
    expect(initials("My Sweet Shop")).toBe("MS");
    expect(initials("  bhatura  ")).toBe("B");
    expect(initials("राम किराना")).toBe("रक");
    expect(initials("")).toBe("");
  });

  it("shows the initials when there is no logo", async () => {
    await render(<Avatar name="My Sweet Shop" uri={null} />);
    expect(screen.getByText("MS", { includeHiddenElements: true })).toBeTruthy();
  });

  it("shows the logo, and falls back to the initials if it cannot load", async () => {
    await render(<Avatar name="My Sweet Shop" uri="https://x/logo.jpg" />);
    expect(screen.queryByText("MS", { includeHiddenElements: true })).toBeNull();
    await fireEvent(screen.getByTestId("avatar-image", { includeHiddenElements: true }), "error");
    expect(screen.getByText("MS", { includeHiddenElements: true })).toBeTruthy();
  });
});
