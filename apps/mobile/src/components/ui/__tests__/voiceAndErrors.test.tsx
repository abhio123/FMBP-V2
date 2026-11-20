import { useState } from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { appendSpoken, speechLang } from "@/lib/speech";
import { ErrorText } from "../ErrorText";
import { MicButton } from "../MicButton";
import { Text } from "../Text";
import { TextBox } from "../TextBox";

// expo-speech-recognition is the stand-in from test-mocks (a phone with a recogniser): its native part is "there", as
// in an installed build. i18n is not loaded in tests.
jest.mock("expo", () => ({ requireOptionalNativeModule: (name: string) => (name === "ExpoSpeechRecognition" ? {} : null) }));
const speech = ExpoSpeechRecognitionModule as unknown as {
  __started: { lang: string }[]; __stopped: number; __granted: boolean;
  __emit: (name: string, e: unknown) => void; __reset: () => void;
};

function Box({ max = 20 }: { max?: number }) {
  const [v, setV] = useState("Fresh");
  return <TextBox value={v} onChangeText={setV} maxLength={max} accessibilityLabel="box" />;
}

describe("speak instead of typing", () => {
  beforeEach(() => speech.__reset());

  it("writes what was said into the box, after what is already there, in the app's language", async () => {
    await render(<Box />);
    await fireEvent.press(screen.getByLabelText("voice.speak"));
    expect(speech.__started[0]).toMatchObject({ lang: "en-IN" });
    await act(async () => { speech.__emit("result", { isFinal: true, results: [{ transcript: "mangoes today" }] }); speech.__emit("end", {}); });
    expect(screen.getByLabelText("box").props.value).toBe("Fresh mangoes today");
  });

  it("keeps the spoken words within the limit and says so", async () => {
    await render(<Box max={12} />);
    await fireEvent.press(screen.getByLabelText("voice.speak"));
    await act(async () => { speech.__emit("result", { isFinal: true, results: [{ transcript: "mangoes from Ratnagiri" }] }); });
    expect(screen.getByLabelText("box").props.value).toBe("Fresh mangoe");
    expect(screen.getByText("common.textCut")).toBeTruthy();
  });

  it("tapping again stops listening; the mic asks once and explains when the microphone is not allowed", async () => {
    const onText = jest.fn();
    await render(<MicButton onText={onText} />);
    await fireEvent.press(screen.getByLabelText("voice.speak"));
    await fireEvent.press(screen.getByLabelText("voice.stop"));
    expect(speech.__stopped).toBe(1);
    await act(async () => { speech.__emit("end", {}); });
    speech.__granted = false;
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await fireEvent.press(screen.getByLabelText("voice.speak"));
    expect(alert).toHaveBeenCalledWith("voice.permissionTitle", "voice.permissionBody", expect.any(Array));
    expect(speech.__started).toHaveLength(1); // not started without the microphone
    alert.mockRestore();
  });

  it("Hindi speech for the Hindi app, and words joined with one space", () => {
    expect(speechLang("hi")).toBe("hi-IN");
    expect(speechLang("en")).toBe("en-IN");
    expect(appendSpoken("Fresh  ", " mangoes ", 50)).toEqual({ text: "Fresh mangoes", cut: false });
    expect(appendSpoken("", "mangoes", 50)).toEqual({ text: "mangoes", cut: false });
  });

  it("a box for codes or names has no mic", async () => {
    await render(<TextBox voice={false} value="" onChangeText={jest.fn()} maxLength={40} />);
    expect(screen.queryByLabelText("voice.speak")).toBeNull();
  });
});

describe("errors are red", () => {
  it("an error message is red, with a warning icon, and announced", async () => {
    await render(<ErrorText>You have already announced something today.</ErrorText>);
    const msg = screen.getByText("You have already announced something today.");
    expect([msg.props.style].flat()).toEqual(expect.arrayContaining([expect.objectContaining({ color: "#DC2626" })]));
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("a colour set on a text replaces the variant's grey (it used to lose)", async () => {
    await render(<><Text variant="caption" className="mb-3 text-danger">red</Text><Text variant="caption">grey</Text></>);
    expect(screen.getByText("red").props.className).not.toContain("text-ink-muted");
    expect(screen.getByText("grey").props.className).toContain("text-ink-muted");
  });
});
