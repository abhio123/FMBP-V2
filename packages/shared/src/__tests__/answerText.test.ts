import { describe, expect, it } from "vitest";
import { answerText, otherTextKey, picksOther, type FormField } from "../formSchema";

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
