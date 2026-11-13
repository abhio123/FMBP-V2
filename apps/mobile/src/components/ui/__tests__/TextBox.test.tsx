import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { TextBox } from "../TextBox";

// i18n is not loaded in unit tests, so messages show as their keys
function Box({ max = 10, multiline = false, onText = jest.fn() }: { max?: number; multiline?: boolean; onText?: (s: string) => void }) {
  const [v, setV] = useState("");
  return <TextBox value={v} onChangeText={(s) => { setV(s); onText(s); }} maxLength={max} multiline={multiline} accessibilityLabel="box" />;
}
const type = (text: string) => fireEvent.changeText(screen.getByLabelText("box"), text);

describe("<TextBox>: room left and why text stops", () => {
  it("says nothing while there is plenty of room, then shows a counter near the limit", async () => {
    await render(<Box />);
    await type("abc");
    expect(screen.queryByText("common.charCount")).toBeNull();
    await type("abcdefgh"); // 8 of 10
    expect(screen.getByText("common.charCount")).toBeTruthy();
    expect(screen.queryByText("common.textLimit")).toBeNull();
  });

  it("at the limit, a red sentence says so", async () => {
    await render(<Box />);
    await type("abcdefghij");
    expect(screen.getByText("common.textLimit")).toBeTruthy();
  });

  it("pasted text that is too long is cut, and the person is told", async () => {
    const onText = jest.fn();
    await render(<Box onText={onText} />);
    await type("abcdefghijKLMNOP");
    expect(onText).toHaveBeenLastCalledWith("abcdefghij");
    expect(screen.getByText("common.textCut")).toBeTruthy();
  });

  it("a one-answer box turns new lines into spaces; a long box keeps them", async () => {
    const one = jest.fn();
    const { unmount } = await render(<Box max={50} onText={one} />);
    await type("Golgappe\nwala");
    expect(one).toHaveBeenLastCalledWith("Golgappe wala");
    unmount();
    const long = jest.fn();
    await render(<Box max={50} multiline onText={long} />);
    await type("line one\nline two");
    expect(long).toHaveBeenLastCalledWith("line one\nline two");
  });
});
