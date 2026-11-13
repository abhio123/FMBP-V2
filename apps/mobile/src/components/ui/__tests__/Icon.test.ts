import Ionicons from "@expo/vector-icons/Ionicons";
import { iconFor } from "../Icon";

// every icon stored in the database today (post_types, categories, intentions, offering_types; info pages)
const DATABASE_ICONS = ["💡", "🔧", "🏨", "📈","🎉","🧑‍⚕️","🚗","🎓","👗","🧑‍🏫","📅","🧑‍💻","📢","💻","🙋","💰","💼","🍽️","🏭","🩺","📣","📸","📦","🛠️","👥","❓","🛵","🏗️","👷","🚛","🤝","⚖️","🌾","⚙️","🧵","🧭","🏪","💸","✈️","🚚","🏷️","🏚️","🧾","🛳️","🏢","📚","🧑‍🍳","✨","🛍️","💇","🏬","📱","🛒"];
const INFO_PAGE_ICONS = ["🏪", "💬", "📄", "📋", "🔒", "🛡️", "📞"];

describe("iconFor (database emoji → line icon)", () => {
  it.each([...DATABASE_ICONS, ...INFO_PAGE_ICONS])("%s has a line icon", (e) => {
    const name = iconFor(e);
    expect(name).not.toBe("ellipse-outline"); // not the fallback
    expect(name in Ionicons.glyphMap).toBe(true);
  });

  it("works with and without the emoji variation selector, takes icon names as they are, falls back", () => {
    expect(iconFor("⚖️")).toBe(iconFor("⚖"));
    expect(iconFor("briefcase-outline")).toBe("briefcase-outline");
    expect(iconFor(null, "pricetag-outline")).toBe("pricetag-outline");
    expect(iconFor("🦄")).toBe("ellipse-outline");
  });
});
