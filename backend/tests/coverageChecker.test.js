const { checkCoverage } = require('../src/services/coverageChecker');

describe('Coverage Checker Tests', () => {
  const requirements = [
    { id: 'r1', text: 'React proficiency', priority: 'must' },
    { id: 'r2', text: 'PostgreSQL database expertise', priority: 'must' },
    { id: 'r3', text: 'Docker containerization', priority: 'nice' }
  ];

  test('detects when all must-have requirements are covered', () => {
    const questions = [
      { id: 'q1', requirement_ids: ['r1'] },
      { id: 'q2', requirement_ids: ['r2'] }
    ];

    const result = checkCoverage(requirements, questions);
    expect(result.isComplete).toBe(true);
    expect(result.uncovered_requirement_ids.length).toBe(0);
  });

  test('flags missing must-have requirements as uncovered gaps', () => {
    const questions = [
      { id: 'q1', requirement_ids: ['r1'] } // r2 is missing!
    ];

    const result = checkCoverage(requirements, questions);
    expect(result.isComplete).toBe(false);
    expect(result.uncovered_requirement_ids).toContain('r2');
    expect(result.uncovered_requirement_ids).not.toContain('r3'); // r3 is nice, not must
  });
});
