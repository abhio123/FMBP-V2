jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("react-native-url-polyfill/auto", () => ({}));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageCode: "en" }] }));
