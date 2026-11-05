import { describe, expect, it } from "vitest";
import { answerText, otherTextKey, picksOther, renderTemplate, type FormField } from "../formSchema";

const skill: FormField = { key: "skill", type: "chips", label_en: "Skill", label_hi: "हुनर", section: "basic",
  options: [{ value: "cook", label_en: "Cook", label_hi: "रसोइया" }, { value: "other", label_en: "Other", label_hi: "कुछ और" }] };
const tags: FormField = { ...skill, key: "tags", type: "multichips" };

describe("answerText / Other", () => {
  it("uses the option label", () => {
    expect(answerText(skill, { skill: "cook" }, "en")).toBe("Cook");
    expect(answerText(skill, { skill: "cook" }, "hi")).toBe("रसोइया");
  });
  it("uses the user's own words when they picked Other and typed something", () => {
    const values = { skill: "other", [otherTextKey("skill")]: "Tandoor cook" };
    expect(picksOther(skill, values)).toBe(true);
    expect(answerText(skill, values, "en")).toBe("Tandoor cook");
    expect(answerText(tags, { tags: ["cook", "other"], tags_other: "Momos" }, "en")).toBe("Cook, Momos");
  });
  it("keeps 'Other' when nothing was typed (the text box is optional)", () => {
    expect(answerText(skill, { skill: "other" }, "en")).toBe("Other");
    expect(answerText(skill, { skill: "other", skill_other: "   " }, "en")).toBe("Other");
  });
  it("is empty for unanswered fields", () => {
    expect(answerText(skill, {}, "en")).toBe("");
    expect(picksOther(skill, { skill: "cook" })).toBe(false);
  });
});

const purpose: FormField = { key: "purpose", type: "chips", label_en: "For what?", label_hi: "किस लिए?", section: "basic",
  options: [
    { value: "expand_shop", label_en: "Expand shop", label_hi: "दुकान बढ़ाना", phrase_en: "expanding the shop", phrase_hi: "दुकान बढ़ाने" },
    { value: "marketing", label_en: "Marketing", label_hi: "मार्केटिंग" },
    { value: "gst", label_en: "GST filing", label_hi: "GST फाइलिंग" },
    { value: "other", label_en: "Other", label_hi: "अन्य" },
  ] };

describe("answerText / sentence wording (phrase)", () => {
  it("uses phrase_* inside generated sentences, the label everywhere else", () => {
    expect(answerText(purpose, { purpose: "expand_shop" }, "en", { phrase: true })).toBe("expanding the shop");
    expect(answerText(purpose, { purpose: "expand_shop" }, "hi", { phrase: true })).toBe("दुकान बढ़ाने");
    expect(answerText(purpose, { purpose: "expand_shop" }, "en")).toBe("Expand shop");
  });
  it("starts an English label lowercase mid-sentence, but keeps acronyms and Hindi as they are", () => {
    expect(answerText(purpose, { purpose: "marketing" }, "en", { phrase: true })).toBe("marketing");
    expect(answerText(purpose, { purpose: "gst" }, "en", { phrase: true })).toBe("GST filing");
    expect(answerText(purpose, { purpose: "marketing" }, "hi", { phrase: true })).toBe("मार्केटिंग");
  });
  it("keeps the user's own words for Other", () => {
    expect(answerText(purpose, { purpose: "other", purpose_other: "Repair roof" }, "en", { phrase: true })).toBe("Repair roof");
  });
  it("renders a natural title, and each sentence starts with a capital", () => {
    const h = { amount: "₹5 lakh", purpose: answerText(purpose, { purpose: "expand_shop" }, "en", { phrase: true }) };
    expect(renderTemplate("Need {{amount}} for {{purpose}}", h)).toBe("Need ₹5 lakh for expanding the shop");
    expect(renderTemplate("{{purpose}} training. {{purpose}} again.", { purpose: "cooking" })).toBe("Cooking training. Cooking again.");
  });
});
