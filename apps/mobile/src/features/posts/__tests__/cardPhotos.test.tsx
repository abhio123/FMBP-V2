import { render, screen } from "@testing-library/react-native";
import { cardPhotoUrls, thumbUrl } from "../media";
import { CardPhotos } from "../CardPhotos";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));

const BASE = "https://db.example/storage/v1/object/public/business-media/b1";
const photo = (n: number) => `${BASE}/post-${n}-abc.jpg`;

describe("post card photos", () => {
  it("small copy sits next to the photo", () => {
    expect(thumbUrl(photo(1))).toBe(`${BASE}/post-1-abc.thumb.jpg`);
  });

  it("takes uploaded photos from the answers, skips phone paths and other links", () => {
    expect(cardPhotoUrls(
      { photos: [photo(1), "file:///data/x.jpg", photo(2)], kind: "shop" },
      { factory_images: [photo(3), photo(1)], website: ["https://example.com/a.jpg"] },
      null,
    )).toEqual([photo(1), photo(2), photo(3)]);
  });

  it("shows up to three, with +N for the rest", async () => {
    await render(<CardPhotos urls={[1, 2, 3, 4, 5].map(photo)} />);
    expect(screen.getByText("+2")).toBeTruthy();
    expect(screen.getByLabelText("post.photoCount")).toBeTruthy();
  });

  it("shows nothing for a post without photos", async () => {
    await render(<CardPhotos urls={[]} />);
    expect(screen.toJSON()).toBeNull();
  });
});
