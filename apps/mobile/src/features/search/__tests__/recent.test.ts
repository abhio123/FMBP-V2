import AsyncStorage from "@react-native-async-storage/async-storage";
import { addRecentSearch, clearRecentSearches, getRecentSearches } from "../recent";

describe("recent searches", () => {
  beforeEach(() => AsyncStorage.clear());

  it("keeps the newest first, without duplicates, at most 6", async () => {
    for (const q of ["cook", "bike", "Cook", "shop", "tiffin", "tailor", "tuition", "delivery"]) await addRecentSearch(q);
    expect(await getRecentSearches()).toEqual(["delivery", "tuition", "tailor", "tiffin", "shop", "Cook"]);
  });

  it("ignores half-typed single letters and can be cleared", async () => {
    await addRecentSearch(" c ");
    expect(await getRecentSearches()).toEqual([]);
    await addRecentSearch("cook");
    await clearRecentSearches();
    expect(await getRecentSearches()).toEqual([]);
  });
});
