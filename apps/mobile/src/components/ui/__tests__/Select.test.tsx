import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Select } from "../Select";

// an iPhone with a notch: 47 pt status bar, 34 pt home indicator
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const show = (ui: React.ReactElement) => render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

const languages = [{ value: "en", label: "English" }, { value: "hi", label: "हिंदी" }];

describe("<Select> as a dialog (few choices, no search)", () => {
  it("shows every choice as a radio option, marks the current one, and selecting closes it", async () => {
    const onChange = jest.fn();
    await show(<Select options={languages} value="en" onChange={onChange} placeholder="Choose language" searchable={false} />);
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
    await show(<Select options={languages} value="en" onChange={onChange} placeholder="Choose language" searchable={false} />);
    await fireEvent.press(screen.getByText("English"));
    await fireEvent.press(screen.getByText("common.cancel"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });
});

describe("<Select> full screen (long lists with search)", () => {
  it("starts below the status bar and above the home indicator (the title was under the clock on iPhone)", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: `Category ${i}` }));
    await show(<Select options={many} value={null} onChange={() => {}} placeholder="What kind of business?" />);
    await fireEvent.press(screen.getByText("What kind of business?")); // the field
    const titles = screen.getAllByText("What kind of business?");
    type Node = { props: { style?: unknown }; parent: Node | null };
    // the screen-sized box around the title carries the padding
    let box = (titles[titles.length - 1] as unknown as Node).parent;
    while (box && !JSON.stringify(box.props.style ?? "").includes("paddingTop")) box = box.parent;
    expect(JSON.stringify(box?.props.style)).toContain("\"paddingTop\":55"); // 47 + 8
    expect(JSON.stringify(box?.props.style)).toContain("\"paddingBottom\":34");
  });
});

describe("<Select> search in Hindi and highlight", () => {
  const decomposed = "दर्ज़ी"; // दर्ज़ी as stored: ज + dot
  const precomposed = "दर्ज़ी"; // दर्ज़ी as some keyboards send it: ज़ as one letter
  const options = [{ value: "tailor", label: decomposed }, { value: "cook", label: "Cook" }, { value: "x", label: "Other" }];

  it("finds the word whichever way the keyboard sends the dotted letter", async () => {
    const onChange = jest.fn();
    await show(<Select options={options} value={null} onChange={onChange} placeholder="Work" alwaysShow="x" />);
    await fireEvent.press(screen.getByText("Work"));
    await fireEvent.changeText(screen.getByPlaceholderText("common.search"), precomposed);
    expect(screen.queryByText("Cook")).toBeNull();
    expect(screen.queryByText("common.notInList")).toBeNull(); // found
  });

  it("marks the searched letters in the cards, as on the search page", async () => {
    await show(<Select options={options} value={null} onChange={jest.fn()} placeholder="Work" alwaysShow="x" />);
    await fireEvent.press(screen.getByText("Work"));
    await fireEvent.changeText(screen.getByPlaceholderText("common.search"), "coo");
    expect(screen.getByText("Coo")).toBeTruthy(); // its own highlighted piece of "Cook"
  });
});
