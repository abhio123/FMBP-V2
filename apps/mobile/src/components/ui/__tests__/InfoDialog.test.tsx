import { render, screen } from "@testing-library/react-native";
import { InfoDialog } from "../InfoDialog";

// i18n is not loaded in unit tests, so labels show as their keys
const info = { title: "Offering a Service?", items: ["Tailoring", "House cleaning", "Child care & patient care"] };
const lines = () => screen.getAllByText(/Tailoring|cleaning|patient/).map((n) => n.props.children);

describe("<InfoDialog> after a search", () => {
  it("marks only the searched letters and puts that line first", async () => {
    await render(<InfoDialog info={info} onClose={jest.fn()} searched="child care" />);
    expect(screen.getByText("Child")).toBeTruthy(); // the letters are their own highlighted pieces
    expect(screen.getAllByText(/^care$/i)).toHaveLength(2);
    const shown = JSON.stringify(screen.toJSON());
    expect(shown.indexOf("Child")).toBeLessThan(shown.indexOf("Tailoring")); // first in the list
    expect(screen.queryByText("common.comesUnder")).toBeNull();
  });

  it("says the word comes under this when only a hidden search word matched", async () => {
    await render(<InfoDialog info={info} onClose={jest.fn()} searched="babysitter" />);
    expect(screen.getByText("common.comesUnder")).toBeTruthy();
    expect(lines()).toEqual(info.items); // order unchanged
  });

  it("without a search it is the plain list", async () => {
    await render(<InfoDialog info={info} onClose={jest.fn()} />);
    expect(lines()).toEqual(info.items);
    expect(screen.queryByText("common.comesUnder")).toBeNull();
  });
});
