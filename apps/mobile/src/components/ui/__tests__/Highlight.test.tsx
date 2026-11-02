import { render, screen } from "@testing-library/react-native";
import { Highlight } from "../Highlight";

describe("<Highlight>", () => {
  it("renders the matched letters as their own highlighted pieces, keeping the full text", async () => {
    await render(<Highlight text="Selling jalebi making machine, jaledal too" terms={["jale"]} />);
    expect(screen.getAllByText("jale")).toHaveLength(2); // only the typed letters are separate highlighted pieces
    expect(screen.getByText("Selling jalebi making machine, jaledal too")).toBeTruthy(); // whole line still readable
  });

  it("renders plain text when there are no terms (all non-search screens)", async () => {
    await render(<Highlight text="Selling machine" />);
    expect(screen.getByText("Selling machine")).toBeTruthy();
    expect(screen.queryByText("machine")).toBeNull(); // not split into pieces
  });
});
