/**
 * Deterministic Preparation Schedule Allocator
 * Section 8 Requirement:
 * - Distribute questions across exactly daysAvailable days.
 * - Every day has a focus, a set of question_ids, and integer duration in minutes.
 * - Every must-have requirement appears somewhere in the schedule.
 * - Harder and higher-priority material lands earlier (Day 1..N), not the night before.
 */

function allocateSchedule(questions = [], requirements = [], daysAvailable = 5) {
  const totalDays = Math.max(1, Math.min(Math.floor(daysAvailable), 60));

  // Map requirements by ID for quick lookup
  const reqMap = new Map();
  requirements.forEach(req => {
    if (req && req.id) {
      reqMap.set(req.id, req);
    }
  });

  // Calculate priority score for each question
  const scoredQuestions = questions.map(q => {
    const isMust = (q.requirement_ids || []).some(reqId => {
      const r = reqMap.get(reqId);
      return r && r.priority === 'must';
    });

    const difficulty = Number(q.difficulty) || 2;
    // Must priority gets +100 base score, difficulty adds 1-3
    const score = (isMust ? 100 : 10) + difficulty;

    // Estimate duration based on difficulty (difficulty 1: 20m, 2: 30m, 3: 45m)
    const baseMinutes = difficulty === 3 ? 45 : difficulty === 2 ? 30 : 20;

    return {
      id: q.id,
      category: q.category || 'general',
      isMust,
      difficulty,
      score,
      minutes: baseMinutes,
      requirement_ids: q.requirement_ids || []
    };
  });

  // Sort descending by score so highest priority and difficulty land earliest
  scoredQuestions.sort((a, b) => b.score - a.score);

  // Initialize day buckets
  const days = Array.from({ length: totalDays }, (_, i) => ({
    day: i + 1,
    focus: '',
    question_ids: [],
    minutes: 0,
    categories: new Set()
  }));

  // Distribute questions: allocate to days with preference for earlier days
  // We use a smooth front-weighted bucket distribution algorithm
  scoredQuestions.forEach((q, index) => {
    let targetDayIndex;

    if (totalDays === 1) {
      targetDayIndex = 0;
    } else {
      // Front-weight: earlier items in sorted list map to lower day indices
      // Using quadratic distribution to place harder/must items earlier
      const ratio = index / Math.max(1, scoredQuestions.length);
      targetDayIndex = Math.min(totalDays - 1, Math.floor(Math.pow(ratio, 1.2) * totalDays));
    }

    const dayObj = days[targetDayIndex];
    dayObj.question_ids.push(q.id);
    dayObj.minutes += q.minutes;
    dayObj.categories.add(q.category);
  });

  // Check if every must-have requirement with available questions is in schedule
  const scheduledQuestionIds = new Set(days.flatMap(d => d.question_ids));
  const coveredMustReqs = new Set();

  questions.forEach(q => {
    if (scheduledQuestionIds.has(q.id)) {
      (q.requirement_ids || []).forEach(reqId => {
        const r = reqMap.get(reqId);
        if (r && r.priority === 'must') {
          coveredMustReqs.add(reqId);
        }
      });
    }
  });

  // Force include any un-scheduled must-have questions into early days
  requirements.forEach(req => {
    if (req.priority === 'must' && !coveredMustReqs.has(req.id)) {
      const missingQ = questions.find(q => (q.requirement_ids || []).includes(req.id));
      if (missingQ && !scheduledQuestionIds.has(missingQ.id)) {
        days[0].question_ids.push(missingQ.id);
        days[0].minutes += (Number(missingQ.difficulty) === 3 ? 45 : 30);
        days[0].categories.add(missingQ.category || 'technical');
        scheduledQuestionIds.add(missingQ.id);
      }
    }
  });

  // Format focus title and output days array matching Appendix A schema
  const formattedDays = days.map(d => {
    const cats = Array.from(d.categories);
    let focusTitle = 'General Preparation & Review';

    if (cats.includes('technical') && cats.includes('system-design')) {
      focusTitle = 'Technical Deep Dive & System Design';
    } else if (cats.includes('technical')) {
      focusTitle = 'Core Technical Skills & Problem Solving';
    } else if (cats.includes('behavioural')) {
      focusTitle = 'Behavioural & Leadership Experience';
    } else if (cats.includes('company-fit')) {
      focusTitle = 'Company Values, Role Fit & Architecture';
    } else if (cats.length > 0) {
      focusTitle = `${cats[0].charAt(0).toUpperCase() + cats[0].slice(1)} Focus`;
    }

    // Default to at least 30 minutes if empty day
    const durationMinutes = d.minutes > 0 ? Math.round(d.minutes) : 30;

    return {
      day: d.day,
      focus: focusTitle,
      question_ids: d.question_ids,
      minutes: durationMinutes
    };
  });

  return {
    days_available: totalDays,
    days: formattedDays
  };
}

module.exports = { allocateSchedule };
