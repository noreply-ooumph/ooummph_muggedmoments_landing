/**
 * MuggedMoments — Dynamic Question Rules (pure, client-safe)
 *
 * Types, condition evaluation, and schema-building for the Question catalog.
 * Deliberately contains NO Prisma import and NO I/O — this file is imported by both
 * the server (leadService.ts, the /api/questions route) and the browser
 * (ProgressiveForm.tsx). Data fetching (Prisma) lives only in dynamicQuestionsService.ts;
 * importing that file from a "use client" component would bundle the Prisma client into
 * the browser build, which is unsupported — hence this split.
 *
 * displayCondition operator semantics intentionally mirror
 * domain/completeness/completenessService.ts's isConditionMet (eq | neq | in | nin | exists)
 * so the same condition shape behaves identically everywhere in the app. That function is
 * not exported there, so the equivalent logic is duplicated here rather than modifying
 * that file (out of scope for this change).
 */

import { z, type ZodTypeAny } from "zod";

export type DynamicFieldType =
  | "text"
  | "select"
  | "multiselect"
  | "date"
  | "number"
  | "phone"
  | "checkbox";

export interface DynamicQuestionOption {
  value: string;
  label: string;
}

export interface DynamicQuestionCondition {
  field: string;
  operator: "eq" | "neq" | "in" | "nin" | "exists";
  value?: unknown;
}

export interface DynamicQuestionValidationRule {
  type: string;
  params?: Record<string, unknown>;
}

export interface DynamicQuestion {
  questionKey: string;
  label: string;
  fieldType: DynamicFieldType;
  required: boolean;
  options: DynamicQuestionOption[] | null;
  displayCondition: DynamicQuestionCondition | null;
  validationRule: DynamicQuestionValidationRule | null;
  order: number;
}

export const VALID_FIELD_TYPES: readonly DynamicFieldType[] = [
  "text",
  "select",
  "multiselect",
  "date",
  "number",
  "phone",
  "checkbox",
];

export function isValidFieldType(value: string): value is DynamicFieldType {
  return (VALID_FIELD_TYPES as readonly string[]).includes(value);
}

/**
 * Maps a raw Prisma Question row (or an equivalent plain JSON object, e.g. from an API
 * response) into the typed DynamicQuestion shape. A row with an unrecognized fieldType
 * is skipped (not rendered, not validated) rather than crashing the form — this is a
 * data-integrity guard, not a feature.
 */
export function toDynamicQuestion(row: {
  questionKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  options: unknown;
  displayCondition: unknown;
  validationRule: unknown;
  order: number;
}): DynamicQuestion | null {
  if (!isValidFieldType(row.fieldType)) {
    return null;
  }

  return {
    questionKey: row.questionKey,
    label: row.label,
    fieldType: row.fieldType,
    required: row.required,
    options: (row.options as DynamicQuestionOption[] | null) ?? null,
    displayCondition:
      (row.displayCondition as DynamicQuestionCondition | null) ?? null,
    validationRule:
      (row.validationRule as DynamicQuestionValidationRule | null) ?? null,
    order: row.order,
  };
}

/**
 * Evaluates a single displayCondition against the current in-progress form values.
 * Mirrors completenessService.isConditionMet's operator contract exactly.
 */
function isConditionMet(
  condition: DynamicQuestionCondition,
  formValues: Record<string, unknown>
): boolean {
  const fieldValue = formValues[condition.field];

  switch (condition.operator) {
    case "exists": {
      if (fieldValue === null || fieldValue === undefined) return false;
      if (typeof fieldValue === "string") return fieldValue.trim().length > 0;
      if (Array.isArray(fieldValue)) return fieldValue.length > 0;
      return Boolean(fieldValue);
    }
    case "eq":
      return fieldValue === condition.value;
    case "neq":
      return fieldValue !== condition.value;
    case "in":
      return (
        Array.isArray(condition.value) && condition.value.includes(fieldValue)
      );
    case "nin":
      return (
        Array.isArray(condition.value) && !condition.value.includes(fieldValue)
      );
    default:
      return false;
  }
}

/**
 * Filters a candidate question list down to the ones that should actually be shown,
 * given the current form values. A question with no displayCondition is always visible.
 */
export function filterVisibleQuestions(
  questions: DynamicQuestion[],
  formValues: Record<string, unknown>
): DynamicQuestion[] {
  return questions.filter((question) => {
    if (!question.displayCondition) return true;
    return isConditionMet(question.displayCondition, formValues);
  });
}

/**
 * Applies the one supported validationRule type for this version.
 * CONFIGURATION_REQUIRED: extend when new validationRule.type values are needed.
 */
function applyValidationRule(
  schema: ZodTypeAny,
  rule: DynamicQuestionValidationRule | null
): ZodTypeAny {
  if (!rule) return schema;

  if (rule.type === "maxLength") {
    const length = rule.params?.length;
    if (typeof length === "number" && "max" in schema) {
      return (schema as unknown as { max: (n: number) => ZodTypeAny }).max(
        length
      );
    }
  }

  return schema;
}

/**
 * Builds a single field's Zod schema from its DynamicQuestion definition.
 */
function buildFieldSchema(question: DynamicQuestion): ZodTypeAny {
  const optionValues = (question.options ?? []).map((o) => o.value);

  switch (question.fieldType) {
    case "text":
    case "phone": {
      let schema: ZodTypeAny = question.required
        ? z.string().min(1, `${question.label} is required.`)
        : z.string().optional();
      schema = applyValidationRule(schema, question.validationRule);
      return schema;
    }

    case "number": {
      return question.required
        ? z.number({ message: `${question.label} is required.` })
        : z.number().optional();
    }

    case "date": {
      const dateSchema = z.string().refine((val) => !isNaN(new Date(val).getTime()), {
        message: `${question.label} must be a valid date.`,
      });
      return question.required ? dateSchema : dateSchema.optional();
    }

    case "select": {
      const base =
        optionValues.length > 0
          ? z.string().refine((val) => optionValues.includes(val), {
              message: `${question.label} must be one of the available options.`,
            })
          : z.string();
      return question.required
        ? base.refine((val) => val.length > 0, {
            message: `${question.label} is required.`,
          })
        : base.optional();
    }

    case "multiselect": {
      const arraySchema =
        optionValues.length > 0
          ? z
              .array(z.string())
              .refine((vals) => vals.every((v) => optionValues.includes(v)), {
                message: `${question.label} contains an invalid option.`,
              })
          : z.array(z.string());
      return question.required
        ? arraySchema.min(1, `${question.label} is required.`)
        : arraySchema.optional();
    }

    case "checkbox": {
      // A required checkbox is treated as a must-be-checked agreement (consent-style),
      // matching how the core WhatsApp consent field is conceptually gated in the UI.
      return question.required
        ? z.literal(true, { message: `${question.label} must be checked.` })
        : z.boolean().optional();
    }
  }
}

/**
 * Builds a Zod object schema for exactly the given (already-visible) questions.
 * Keys not present in `questions` are ignored by this schema (not stripped from the
 * input object — Zod's default object behavior).
 */
export function buildDynamicQuestionSchema(
  questions: DynamicQuestion[]
): ZodTypeAny {
  const shape: Record<string, ZodTypeAny> = {};
  for (const question of questions) {
    shape[question.questionKey] = buildFieldSchema(question);
  }
  return z.object(shape);
}
