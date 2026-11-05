import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PhotoViewer } from "../PhotoViewer";

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const show = (ui: React.ReactElement) => render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

const urls = ["https://x/1.jpg", "https://x/2.jpg", "https://x/3.jpg"];

describe("<PhotoViewer> (photo over the screen)", () => {
  it("is closed until a photo is chosen", async () => {
    await show(<PhotoViewer urls={urls} index={null} onClose={() => {}} />);
    expect(screen.queryByText("1 / 3")).toBeNull();
  });

  it("opens with a counter for several photos and closes with the close button", async () => {
    const onClose = jest.fn();
    await show(<PhotoViewer urls={urls} index={0} onClose={onClose} />);
    expect(screen.getByText("1 / 3")).toBeTruthy();
    // the ✕ button (the dark backdrop also closes, so it has the same label); it comes last
    await fireEvent.press(screen.getAllByRole("button", { name: /close/i }).at(-1)!);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows no counter for a single photo", async () => {
    await show(<PhotoViewer urls={[urls[0]]} index={0} onClose={() => {}} />);
    expect(screen.queryByText("1 / 1")).toBeNull();
    expect(screen.getAllByRole("button", { name: /close/i }).length).toBeGreaterThan(0);
  });
});
