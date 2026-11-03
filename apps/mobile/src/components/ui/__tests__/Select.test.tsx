import { fireEvent, render, screen } from "@testing-library/react-native";
import { Select } from "../Select";

const languages = [{ value: "en", label: "English" }, { value: "hi", label: "हिंदी" }];

describe("<Select> as a dialog (few choices, no search)", () => {
  it("shows every choice as a radio option, marks the current one, and selecting closes it", async () => {
    const onChange = jest.fn();
    await render(<Select options={languages} value="en" onChange={onChange} placeholder="Choose language" searchable={false} />);
    await fireEvent.press(screen.getByText("English")); // the field
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios[0].props.accessibilityState).toEqual({ selected: true });
    expect(radios[1].props.accessibilityState).toEqual({ selected: false });
    await fireEvent.press(screen.getByText("हिंदी"));
    expect(onChange).toHaveBeenCalledWith("hi");
    expect(screen.queryAllByRole("radio")).toHaveLength(0); // closed
  });

  it("Cancel closes without changing anything", async () => {
    const onChange = jest.fn();
    await render(<Select options={languages} value="en" onChange={onChange} placeholder="Choose language" searchable={false} />);
    await fireEvent.press(screen.getByText("English"));
    await fireEvent.press(screen.getByText("common.cancel"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });
});
