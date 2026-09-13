const { validateKit } = require('../src/services/validator');

describe('Appendix A Kit Validator Tests', () => {
  const validKit = {
    source: {
      company: 'Acme Corp',
      company_url: 'https://acme.com',
      role: 'Senior Backend Engineer',
      location: 'Remote',
      jd_chars: 1200,
      researched_at: '2026-09-01T09:12:44Z',
      pages_used: ['https://acme.com/careers']
    },
    company_brief: {
      summary: 'Leading cloud platform.',
      what_they_do: 'Builds enterprise infrastructure solutions.',
      sources: ['https://acme.com/careers']
    },
    role: {
      title: 'Senior Backend Engineer',
      seniority: 'Senior',
      responsibilities: ['Build APIs', 'Scale databases'],
      requirements: [
        { id: 'r1', text: '5+ years Node.js', kind: 'technical', priority: 'must' }
      ]
    },
    questions: [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Explain event loop.',
        answer_outline: 'Single-threaded async loop.',
        difficulty: 2
      }
    ],
    flashcards: [
      { id: 'f1', front: 'Node.js Event Loop', back: 'Non-blocking I/O loop', requirement_ids: ['r1'] }
    ],
    schedule: {
      days_available: 3,
      days: [
        { day: 1, focus: 'Technical Focus', question_ids: ['q1'], minutes: 30 }
      ]
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 2
    }
  };

  test('validates a conformant Appendix A kit structure', () => {
    const result = validateKit(validKit);
    expect(result.valid).toBe(true);
  });

  test('rejects invalid difficulty values or missing required fields', () => {
    const invalidKit = JSON.parse(JSON.stringify(validKit));
    invalidKit.questions[0].difficulty = 5; // Valid range is 1..3

    const result = validateKit(invalidKit);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
