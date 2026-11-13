jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("react-native-url-polyfill/auto", () => ({}));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageCode: "en" }] }));
// Native module: use the library's own jest mock (both unit and E2E configs share this setup).
jest.mock("react-native-keyboard-controller", () => require("react-native-keyboard-controller/jest"));
// Icon font cannot load in Jest: icons draw nothing (decorative; the text next to them is what tests read). The real
// name list stays, so icon names are still checked.
jest.mock("@expo/vector-icons/Ionicons", () => {
  const Icon = () => null;
  Icon.glyphMap = require("@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json");
  return { __esModule: true, default: Icon };
});