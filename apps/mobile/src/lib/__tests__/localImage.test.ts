import { imageType, photoErrorText } from "../localImage";

jest.mock("expo-file-system", () => ({ File: jest.fn() }));

const bytes = (...b: number[]) => new Uint8Array(b);
const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

describe("imageType (only real photos are uploaded)", () => {
  it("knows JPEG, PNG, WebP and HEIC by their first bytes", () => {
    expect(imageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(imageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(imageType(ascii("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(imageType(ascii("\0\0\0\x18ftypheic"))).toBe("image/heic");
  });

  it("refuses the 14-byte \"File not found\" that Android's fetch returned, and empty files", () => {
    expect(imageType(ascii("File not found"))).toBeNull();
    expect(imageType(bytes())).toBeNull();
  });

  it("turns the refusal into the translated sentence; other errors stay as they are", () => {
    const t = (k: string) => `T:${k}`;
    expect(photoErrorText(new Error("photo_unreadable"), t)).toBe("T:common.photoUnreadable");
    expect(photoErrorText(new Error("Network request failed"), t)).toBe("Network request failed");
  });
});
