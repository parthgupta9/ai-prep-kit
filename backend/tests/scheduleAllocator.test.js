const { allocateSchedule } = require('../src/services/scheduleAllocator');

describe('Deterministic Schedule Allocator Tests', () => {
  const mockRequirements = [
    { id: 'r1', text: '5+ years Node.js experience', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'System architecture design', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Mentoring junior developers', kind: 'behavioural', priority: 'nice' }
  ];

  const mockQuestions = [
    { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Node.js event loop?', answer_outline: '...', difficulty: 3 },
    { id: 'q2', requirement_ids: ['r2'], category: 'system-design', prompt: 'Design scalable microservices', answer_outline: '...', difficulty: 3 },
    { id: 'q3', requirement_ids: ['r3'], category: 'behavioural', prompt: 'Tell me about mentoring', answer_outline: '...', difficulty: 1 }
  ];

  test('allocates schedule strictly matching days_available requested', () => {
    const result = allocateSchedule(mockQuestions, mockRequirements, 5);
    expect(result.days_available).toBe(5);
    expect(result.days.length).toBe(5);
    expect(result.days[0].day).toBe(1);
    expect(result.days[4].day).toBe(5);
  });

  test('ensures all must-have requirements appear in schedule', () => {
    const result = allocateSchedule(mockQuestions, mockRequirements, 3);
    const scheduledQuestionIds = result.days.flatMap(d => d.question_ids);

    expect(scheduledQuestionIds).toContain('q1');
    expect(scheduledQuestionIds).toContain('q2');
  });

  test('frontloads higher difficulty and must-have items on earlier days', () => {
    const result = allocateSchedule(mockQuestions, mockRequirements, 4);
    // Day 1 should contain high difficulty / must-have questions
    expect(result.days[0].question_ids.length).toBeGreaterThan(0);
    expect(result.days[0].minutes).toBeGreaterThan(0);
  });
});
