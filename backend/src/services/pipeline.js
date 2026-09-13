/**
 * Main Sequenced Research & Generation Pipeline Service
 * Section 3, 4, 5, 8, 10 Requirements:
 * 1. Extract requirements from JD text
 * 2. Crawl company site & look for interview process details
 * 3. Generate questions for requirements & categories
 * 4. Generate flashcards
 * 5. Deterministic Coverage Check & Second Pass Loop for missing Must-Have requirements
 * 6. Deterministic Schedule Allocation across requested days
 * 7. Appendix A Kit Validation
 */

const { crawlCompanySite } = require('./crawler');
const { callLLM } = require('./llm');
const { checkCoverage } = require('./coverageChecker');
const { allocateSchedule } = require('./scheduleAllocator');
const { validateKit } = require('./validator');

/**
 * Executes the full prep kit research & generation pipeline for a given case.
 * @param {Object} caseParams - { jd: string, company_url: string, days: number, allowLocal?: boolean }
 * @returns {Promise<Object>} Appendix A Kit object
 */
async function generateKit(caseParams) {
  const { jd = '', company_url = '', days = 5, allowLocal = true } = caseParams;

  const sanitizedJd = jd ? jd.trim() : '';
  const sanitizedDays = Math.max(1, Math.min(Number(days) || 5, 60));
  const timestamp = new Date().toISOString();

  // 1. Crawl Company Website
  let crawlResult = { success: false, pagesUsed: [], extractedContent: '', errors: [] };
  if (company_url && company_url.trim().length > 0) {
    crawlResult = await crawlCompanySite(company_url.trim(), allowLocal);
  }

  const pagesUsed = crawlResult.pagesUsed || [];

  // 2. Extract Requirements & Role Breakdown from JD
  const extractPrompt = `
You are an expert technical interviewer and role analyst.
Analyze the following Job Description (JD) and extract the structured role metadata and requirements.

Job Description:
"""
${sanitizedJd || 'General Software Engineering Role'}
"""

Instructions:
- Title: Extract job title (or "Software Engineer" if vague).
- Seniority: Extract seniority level (e.g., Junior, Mid, Senior, Lead).
- Responsibilities: Array of 2-5 key responsibilities.
- Requirements: Array of requirements mentioned in the JD.
  - Assign each requirement a stable ID starting from "r1", "r2", "r3"...
  - text: The requirement description.
  - kind: Exactly one of "technical", "behavioural", "domain".
  - priority: Exactly "must" if required/mandatory, or "nice" if preferred/bonus points/plus.

Respond strictly in JSON in the following format:
{
  "title": "...",
  "seniority": "...",
  "responsibilities": ["..."],
  "requirements": [
    { "id": "r1", "text": "...", "kind": "technical", "priority": "must" }
  ]
}
`;

  const roleResult = await callLLM(extractPrompt);

  const role = {
    title: roleResult.title || 'Software Engineer',
    seniority: roleResult.seniority || 'Mid-Level',
    responsibilities: Array.isArray(roleResult.responsibilities) && roleResult.responsibilities.length > 0
      ? roleResult.responsibilities
      : ['Develop and maintain software services', 'Collaborate with team members'],
    requirements: Array.isArray(roleResult.requirements) && roleResult.requirements.length > 0
      ? roleResult.requirements.map((r, idx) => ({
          id: r.id || `r${idx + 1}`,
          text: r.text || 'Engineering skill requirement',
          kind: ['technical', 'behavioural', 'domain'].includes(r.kind) ? r.kind : 'technical',
          priority: r.priority === 'nice' ? 'nice' : 'must'
        }))
      : [
          { id: 'r1', text: 'Software development experience', kind: 'technical', priority: 'must' },
          { id: 'r2', text: 'Problem solving and system architecture', kind: 'technical', priority: 'must' },
          { id: 'r3', text: 'Team communication & collaboration', kind: 'behavioural', priority: 'nice' }
        ]
  };

  // 3. Generate Company Brief
  let companyBrief = {
    summary: 'No company website provided or site unreachable.',
    what_they_do: 'Information not available from provided site URL.',
    sources: pagesUsed
  };

  if (crawlResult.success && crawlResult.extractedContent) {
    const briefPrompt = `
Synthesize a concise company brief from the following crawled web page text.

Crawled Content:
"""
${crawlResult.extractedContent.slice(0, 5000)}
"""

Instructions:
- summary: A 1-2 sentence overview of the company.
- what_they_do: 2-3 sentences explaining their main products, services, or engineering focus.

Respond strictly in JSON format:
{
  "summary": "...",
  "what_they_do": "..."
}
`;
    const briefRes = await callLLM(briefPrompt);
    companyBrief = {
      summary: briefRes.summary || 'Company overview synthesized from crawled web data.',
      what_they_do: briefRes.what_they_do || 'Develops technology solutions and software services.',
      sources: pagesUsed
    };
  }

  // 4. Initial Pass Question Generation
  const questionsPrompt = `
Given the following requirements and company context, generate a set of targeted interview questions.

Requirements:
${JSON.stringify(role.requirements, null, 2)}

Company Context:
"${companyBrief.summary}"

Instructions:
- Generate 4 to 8 interview questions.
- Assign each question an ID ("q1", "q2", "q3"...).
- requirement_ids: Array of requirement IDs covered by this question (must reference valid IDs like ["r1"]).
- category: Exactly one of "technical", "behavioural", "system-design", "company-fit".
- prompt: The interview question text.
- answer_outline: A clear, structured outline of what a strong candidate answer should include.
- difficulty: Integer from 1 (easy) to 3 (hard).

Respond strictly in JSON array format:
[
  {
    "id": "q1",
    "requirement_ids": ["r1"],
    "category": "technical",
    "prompt": "...",
    "answer_outline": "...",
    "difficulty": 2
  }
]
`;

  let rawQuestions = await callLLM(questionsPrompt);
  if (!Array.isArray(rawQuestions)) rawQuestions = [];

  let questions = rawQuestions.map((q, idx) => ({
    id: q.id || `q${idx + 1}`,
    requirement_ids: Array.isArray(q.requirement_ids) ? q.requirement_ids : [role.requirements[0].id],
    category: ['technical', 'behavioural', 'system-design', 'company-fit'].includes(q.category) ? q.category : 'technical',
    prompt: q.prompt || 'Explain your technical approach to this scenario.',
    answer_outline: q.answer_outline || 'Cover key concepts, trade-offs, and practical examples.',
    difficulty: Math.max(1, Math.min(Number(q.difficulty) || 2, 3))
  }));

  // 5. Generate Flashcards
  const flashcardPrompt = `
Generate 3-6 study flashcards for the following requirements and questions.

Requirements: ${JSON.stringify(role.requirements)}

Instructions:
- Assign each flashcard an ID ("f1", "f2"...).
- front: The question or key technical term on the card front.
- back: The concise explanation, answer, or key points on the card back.
- requirement_ids: Array of requirement IDs covered (e.g. ["r1"]).

Respond strictly in JSON array format:
[
  { "id": "f1", "front": "...", "back": "...", "requirement_ids": ["r1"] }
]
`;

  let rawFlashcards = await callLLM(flashcardPrompt);
  if (!Array.isArray(rawFlashcards)) rawFlashcards = [];

  let flashcards = rawFlashcards.map((f, idx) => ({
    id: f.id || `f${idx + 1}`,
    front: f.front || 'Key Concept',
    back: f.back || 'Key explanation and best practices.',
    requirement_ids: Array.isArray(f.requirement_ids) ? f.requirement_ids : [role.requirements[0].id]
  }));

  // 6. DETERMINISTIC COVERAGE CHECK & SECOND PASS LOOP
  let passesCount = 1;
  let coverageResult = checkCoverage(role.requirements, questions);

  if (!coverageResult.isComplete && coverageResult.uncovered_requirement_ids.length > 0) {
    passesCount++;
    const uncoveredReqs = role.requirements.filter(r => coverageResult.uncovered_requirement_ids.includes(r.id));

    const secondPassPrompt = `
The following MUST-HAVE requirements do NOT have any interview questions covering them yet.
Generate targeted interview questions specifically for these missing requirements.

Uncovered Requirements:
${JSON.stringify(uncoveredReqs, null, 2)}

Instructions:
- Generate 1 question for each uncovered requirement.
- Use IDs starting from "q${questions.length + 1}".
- requirement_ids: MUST include the corresponding uncovered requirement ID (e.g. ["${uncoveredReqs[0]?.id || 'r1'}"]).
- category: "technical" or "behavioural" or "system-design" or "company-fit".
- prompt: Specific question text.
- answer_outline: Ideal answer outline.
- difficulty: 1 to 3 integer.

Respond strictly in JSON array format.
`;

    const secondPassQuestions = await callLLM(secondPassPrompt);
    if (Array.isArray(secondPassQuestions)) {
      secondPassQuestions.forEach((q, idx) => {
        questions.push({
          id: q.id || `q${questions.length + 1}`,
          requirement_ids: Array.isArray(q.requirement_ids) && q.requirement_ids.length > 0
            ? q.requirement_ids
            : [uncoveredReqs[idx % uncoveredReqs.length]?.id || role.requirements[0].id],
          category: ['technical', 'behavioural', 'system-design', 'company-fit'].includes(q.category) ? q.category : 'technical',
          prompt: q.prompt || 'Targeted question for requirement.',
          answer_outline: q.answer_outline || 'Structured response outline.',
          difficulty: Math.max(1, Math.min(Number(q.difficulty) || 2, 3))
        });
      });
    }

    // Re-check coverage after pass 2
    coverageResult = checkCoverage(role.requirements, questions);
  }

  // 7. DETERMINISTIC PREPARATION SCHEDULE ALLOCATION
  const schedule = allocateSchedule(questions, role.requirements, sanitizedDays);

  // Derive source metadata
  const companyNameFromUrl = company_url ? company_url.replace(/https?:\/\//, '').split('/')[0] : 'Unknown';

  const kit = {
    source: {
      company: companyNameFromUrl,
      company_url: company_url || '',
      role: role.title,
      location: 'Remote / Unspecified',
      jd_chars: sanitizedJd.length,
      researched_at: timestamp,
      pages_used: pagesUsed
    },
    company_brief: companyBrief,
    role: role,
    questions: questions,
    flashcards: flashcards,
    schedule: schedule,
    coverage: {
      uncovered_requirement_ids: coverageResult.uncovered_requirement_ids,
      passes: passesCount
    }
  };

  // 8. Validate against Appendix A schema
  const validation = validateKit(kit);
  if (!validation.valid) {
    console.warn('[Kit Validation Warning]: Kit output had schema warnings:', validation.errors);
  }

  return kit;
}

module.exports = {
  generateKit
};
