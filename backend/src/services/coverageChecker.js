/**
 * Deterministic Coverage Checker
 * Section 4 & 5 Requirement:
 * - Compares generated questions against extracted requirements.
 * - Any requirement with priority === 'must' with no question referencing it comes back as a gap.
 * - Returns list of uncovered_requirement_ids.
 */

function checkCoverage(requirements = [], questions = []) {
  // Collect all requirement IDs covered by any question
  const coveredReqIds = new Set();

  questions.forEach(q => {
    if (Array.isArray(q.requirement_ids)) {
      q.requirement_ids.forEach(id => coveredReqIds.add(id));
    }
  });

  // Find must-have requirement IDs that are not covered
  const uncoveredMustReqIds = requirements
    .filter(req => req.priority === 'must')
    .map(req => req.id)
    .filter(reqId => !coveredReqIds.has(reqId));

  return {
    uncovered_requirement_ids: uncoveredMustReqIds,
    isComplete: uncoveredMustReqIds.length === 0
  };
}

module.exports = { checkCoverage };
