/**
 * MuggedMoments — Unit Tests: Dynamic Question Rules
 */

import { describe, it, expect } from "vitest";
import {
  filterVisibleQuestions,
  buildDynamicQuestionSchema,
  type DynamicQuestion,
} from "@/domain/dynamicQuestions/dynamicQuestionRules";

const ceremonySetting: DynamicQuestion = {
  questionKey: "ceremony_setting",
  label: "Indoor or outdoor ceremony?",
  fieldType: "select",
  required: false,
  options: [
    { value: "indoor", label: "Indoor" },
    { value: "outdoor", label: "Outdoor" },
  ],
  displayCondition: null,
  validationRule: null,
  order: 1,
};

const footfall: DynamicQuestion = {
  questionKey: "expected_footfall",
  label: "Expected footfall",
  fieldType: "number",
  required: true,
  options: null,
  displayCondition: { field: "city", operator: "eq", value: "Lucknow" },
  validationRule: null,
  order: 2,
};

describe("Dynamic Question Rules — filterVisibleQuestions", () => {
  it("shows a question with no displayCondition unconditionally", () => {
    const visible = filterVisibleQuestions([ceremonySetting], {});
    expect(visible).toHaveLength(1);
  });

  it("shows a question whose eq condition matches the current form values", () => {
    const visible = filterVisibleQuestions([footfall], { city: "Lucknow" });
    expect(visible).toHaveLength(1);
  });

  it("hides a question whose eq condition does not match", () => {
    const visible = filterVisibleQuestions([footfall], { city: "Mumbai" });
    expect(visible).toHaveLength(0);
  });
});

describe("Dynamic Question Rules — buildDynamicQuestionSchema", () => {
  it("accepts a valid answer for a non-required select field", () => {
    const schema = buildDynamicQuestionSchema([ceremonySetting]);
    const result = schema.safeParse({ ceremony_setting: "indoor" });
    expect(result.success).toBe(true);
  });

  it("rejects an option value not in the question's option list", () => {
    const schema = buildDynamicQuestionSchema([ceremonySetting]);
    const result = schema.safeParse({ ceremony_setting: "rooftop" });
    expect(result.success).toBe(false);
  });

  it("allows a non-required field to be omitted entirely", () => {
    const schema = buildDynamicQuestionSchema([ceremonySetting]);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects a missing answer for a required field", () => {
    const schema = buildDynamicQuestionSchema([footfall]);
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts a valid answer for a required number field", () => {
    const schema = buildDynamicQuestionSchema([footfall]);
    const result = schema.safeParse({ expected_footfall: 500 });
    expect(result.success).toBe(true);
  });
});
