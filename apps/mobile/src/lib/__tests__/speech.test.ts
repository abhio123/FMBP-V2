describe("speech in Expo Go (no native part)", () => {
  it("shows no mic and never loads the package, so nothing fails", () => {
    jest.isolateModules(() => {
      jest.doMock("expo", () => ({ requireOptionalNativeModule: () => null }));
      const load = jest.fn(() => { throw new Error("Cannot find native module 'ExpoSpeechRecognition'"); });
      jest.doMock("expo-speech-recognition", load);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { speechAvailable, speechModule } = require("../speech") as typeof import("../speech");
      expect(speechModule()).toBeNull();
      expect(speechAvailable()).toBe(false);
      expect(load).not.toHaveBeenCalled();
    });
  });
});
