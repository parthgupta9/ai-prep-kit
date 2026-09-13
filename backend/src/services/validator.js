/**
 * Appendix A Schema Validator using Zod
 * Enforces exact field names, types, enum constraints, and structure.
 */

const { z } = require('zod');

const RequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: z.enum(['technical', 'behavioural', 'domain']),
  priority: z.enum(['must', 'nice'])
});

const QuestionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string()),
  category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
  prompt: z.string().min(1),
  answer_outline: z.string().min(1),
  difficulty: z.number().int().min(1).max(3)
});

const FlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string())
});

const ScheduleDaySchema = z.object({
  day: z.number().int().min(1),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int().min(0)
});

const ScheduleSchema = z.object({
  days_available: z.number().int().min(1),
  days: z.array(ScheduleDaySchema)
});

const CoverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().min(1)
});

const SourceSchema = z.object({
  company: z.string(),
  company_url: z.string(),
  role: z.string(),
  location: z.string(),
  jd_chars: z.number().int(),
  researched_at: z.string(),
  pages_used: z.array(z.string())
});

const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string())
});

const RoleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(RequirementSchema)
});

const KitSchema = z.object({
  source: SourceSchema,
  company_brief: CompanyBriefSchema,
  role: RoleSchema,
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: ScheduleSchema,
  coverage: CoverageSchema
});

/**
 * Validates a generated kit against Appendix A specification.
 * Returns { valid: boolean, errors?: Array }
 */
function validateKit(kit) {
  const result = KitSchema.safeParse(kit);
  if (result.success) {
    return { valid: true, data: result.data };
  } else {
    return {
      valid: false,
      errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
    };
  }
}

module.exports = {
  KitSchema,
  validateKit
};
