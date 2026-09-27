jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("react-native-url-polyfill/auto", () => ({}));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageCode: "en" }] }));
// Native module: use the library's own jest mock (both unit and E2E configs share this setup).
jest.mock("react-native-keyboard-controller", () => require("react-native-keyboard-controller/jest"));
