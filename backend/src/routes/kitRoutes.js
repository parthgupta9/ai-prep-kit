/**
 * Kit Management & AI Generation Routes (/api/kits)
 */

const express = require('express');
const Kit = require('../models/Kit');
const { authMiddleware } = require('../middleware/authMiddleware');
const { generateKit } = require('../services/pipeline');
const { callLLM } = require('../services/llm');
const { allocateSchedule } = require('../services/scheduleAllocator');

const router = express.Router();

// In-memory kits fallback if MongoDB is offline
const inMemoryKits = new Map();

// Generate Kit (Single or Batch)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { jd, company_url, days, batch } = req.body;

    // Handle Batch Creation if batch array provided
    if (Array.isArray(batch) && batch.length > 0) {
      const results = [];
      for (const item of batch) {
        try {
          const kitData = await generateKit({
            jd: item.jd || '',
            company_url: item.company_url || '',
            days: item.days || 5,
            allowLocal: false
          });

          let savedKit = null;
          try {
            savedKit = await Kit.create({
              userId: req.user.userId,
              input: { jd: item.jd, company_url: item.company_url, days: item.days || 5 },
              kitData
            });
          } catch (dbErr) {
            savedKit = {
              _id: 'mem_kit_' + Date.now() + Math.random().toString(36).substring(2, 7),
              userId: req.user.userId,
              input: { jd: item.jd, company_url: item.company_url, days: item.days || 5 },
              kitData,
              createdAt: new Date()
            };
            inMemoryKits.set(savedKit._id.toString(), savedKit);
          }
          results.push({ success: true, kitId: savedKit._id, kit: kitData });
        } catch (e) {
          results.push({ success: false, error: e.message, item });
        }
      }
      return res.status(201).json({ message: 'Batch kits created', results });
    }

    // Single Kit Generation
    if (!jd || jd.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide a valid Job Description text.' });
    }

    const kitData = await generateKit({
      jd: jd.trim(),
      company_url: company_url ? company_url.trim() : '',
      days: Number(days) || 5,
      allowLocal: false
    });

    let savedKit = null;
    try {
      savedKit = await Kit.create({
        userId: req.user.userId,
        input: { jd, company_url, days: Number(days) || 5 },
        kitData
      });
    } catch (dbErr) {
      savedKit = {
        _id: 'mem_kit_' + Date.now(),
        userId: req.user.userId,
        input: { jd, company_url, days: Number(days) || 5 },
        kitData,
        createdAt: new Date()
      };
      inMemoryKits.set(savedKit._id.toString(), savedKit);
    }

    res.status(201).json({
      message: 'Kit generated successfully',
      kitId: savedKit._id,
      kit: kitData
    });
  } catch (err) {
    console.error('[Kit Generation API Error]', err);
    res.status(500).json({ error: err.message || 'Failed to generate kit.' });
  }
});

// List all user's kits
router.get('/', authMiddleware, async (req, res) => {
  try {
    let kits = [];
    try {
      kits = await Kit.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    } catch (e) {
      kits = Array.from(inMemoryKits.values()).filter(k => k.userId === req.user.userId);
    }
    res.json({ kits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single kit by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    let kitDoc = null;
    try {
      kitDoc = await Kit.findOne({ _id: req.params.id, userId: req.user.userId });
    } catch (e) {
      kitDoc = inMemoryKits.get(req.params.id);
    }

    if (!kitDoc) {
      return res.status(404).json({ error: 'Kit not found' });
    }

    res.json({ kit: kitDoc.kitData, input: kitDoc.input, kitId: kitDoc._id, practiceState: kitDoc.practiceState });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save / Update edited kit
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { kitData, practiceState } = req.body;
    if (!kitData) {
      return res.status(400).json({ error: 'Missing kitData body.' });
    }

    let kitDoc = null;
    try {
      kitDoc = await Kit.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.userId },
        { kitData, practiceState, updatedAt: new Date() },
        { new: true }
      );
    } catch (e) {
      kitDoc = inMemoryKits.get(req.params.id);
      if (kitDoc && kitDoc.userId === req.user.userId) {
        kitDoc.kitData = kitData;
        if (practiceState) kitDoc.practiceState = practiceState;
        kitDoc.updatedAt = new Date();
      }
    }

    if (!kitDoc) {
      return res.status(404).json({ error: 'Kit not found or unauthorized' });
    }

    res.json({ message: 'Kit saved successfully', kit: kitDoc.kitData, practiceState: kitDoc.practiceState });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Regenerate single section without discarding edits elsewhere
router.post('/:id/regenerate-section', authMiddleware, async (req, res) => {
  try {
    const { section, categoryName } = req.body; // section: 'company_brief' | 'category' | 'schedule'
    if (!section) {
      return res.status(400).json({ error: 'Section parameter is required.' });
    }

    let kitDoc = null;
    try {
      kitDoc = await Kit.findOne({ _id: req.params.id, userId: req.user.userId });
    } catch (e) {
      kitDoc = inMemoryKits.get(req.params.id);
    }

    if (!kitDoc) {
      return res.status(404).json({ error: 'Kit not found' });
    }

    const currentKit = kitDoc.kitData;

    if (section === 'company_brief') {
      const briefPrompt = `
Regenerate a fresh company brief for role "${currentKit.role?.title}" at "${currentKit.source?.company}".
Provide summary and what_they_do.
Respond strictly in JSON: { "summary": "...", "what_they_do": "..." }
`;
      const freshBrief = await callLLM(briefPrompt);
      currentKit.company_brief.summary = freshBrief.summary || currentKit.company_brief.summary;
      currentKit.company_brief.what_they_do = freshBrief.what_they_do || currentKit.company_brief.what_they_do;
    } else if (section === 'category' && categoryName) {
      const targetCategory = categoryName.toLowerCase();
      // Identify questions in this category that are NOT pinned/user-edited
      const existingReqs = currentKit.role?.requirements || [];
      const catPrompt = `
Generate 2 fresh interview questions for category "${targetCategory}" based on:
Requirements: ${JSON.stringify(existingReqs)}

Respond strictly in JSON array format:
[
  { "id": "q_new1", "requirement_ids": ["${existingReqs[0]?.id || 'r1'}"], "category": "${targetCategory}", "prompt": "...", "answer_outline": "...", "difficulty": 2 }
]
`;
      const freshQuestions = await callLLM(catPrompt);
      if (Array.isArray(freshQuestions)) {
        // Keep questions that were manually edited or pinned or belong to other categories
        const uneditedCatIndex = currentKit.questions.findIndex(q => q.category === targetCategory && !q.isPinned && !q.isEdited);
        if (uneditedCatIndex !== -1) {
          // Replace unedited question with newly generated
          currentKit.questions[uneditedCatIndex] = {
            id: `q_regen_${Date.now()}`,
            requirement_ids: freshQuestions[0].requirement_ids || [existingReqs[0]?.id || 'r1'],
            category: targetCategory,
            prompt: freshQuestions[0].prompt,
            answer_outline: freshQuestions[0].answer_outline,
            difficulty: Number(freshQuestions[0].difficulty) || 2
          };
        } else {
          // Append new question if none available to replace
          currentKit.questions.push({
            id: `q_regen_${Date.now()}`,
            requirement_ids: freshQuestions[0].requirement_ids || [existingReqs[0]?.id || 'r1'],
            category: targetCategory,
            prompt: freshQuestions[0].prompt,
            answer_outline: freshQuestions[0].answer_outline,
            difficulty: Number(freshQuestions[0].difficulty) || 2
          });
        }
      }
    } else if (section === 'schedule') {
      const daysAvail = currentKit.schedule?.days_available || 5;
      currentKit.schedule = allocateSchedule(currentKit.questions, currentKit.role?.requirements || [], daysAvail);
    }

    // Save updated kit
    try {
      await Kit.updateOne({ _id: kitDoc._id }, { kitData: currentKit, updatedAt: new Date() });
    } catch (e) {
      kitDoc.kitData = currentKit;
    }

    res.json({ message: `Regenerated section ${section} successfully`, kit: currentKit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Creative Feature: Interactive AI Mock Interview Feedback
router.post('/:id/mock-interview', authMiddleware, async (req, res) => {
  try {
    const { questionId, userAnswer } = req.body;
    if (!questionId || !userAnswer || userAnswer.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide a valid questionId and user answer.' });
    }

    let kitDoc = null;
    try {
      kitDoc = await Kit.findOne({ _id: req.params.id, userId: req.user.userId });
    } catch (e) {
      kitDoc = inMemoryKits.get(req.params.id);
    }

    if (!kitDoc) {
      return res.status(404).json({ error: 'Kit not found' });
    }

    const question = (kitDoc.kitData.questions || []).find(q => q.id === questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found in kit' });
    }

    const evalPrompt = `
You are a senior technical interviewer evaluating a candidate's response.

Interview Question:
"${question.prompt}"

Expected Answer Outline:
"${question.answer_outline}"

Candidate's Answer:
"${userAnswer}"

Instructions:
Evaluate the answer and provide feedback.
- score: Integer from 1 to 10.
- rating: "Excellent", "Good", "Needs Improvement", or "Weak".
- key_strengths: Array of 1-3 specific strengths in the response.
- missing_points: Array of 1-3 critical gaps or missed concepts.
- star_sample_answer: A polished, ideal answer using the STAR (Situation, Task, Action, Result) method.

Respond strictly in JSON format:
{
  "score": 8,
  "rating": "Good",
  "key_strengths": ["..."],
  "missing_points": ["..."],
  "star_sample_answer": "..."
}
`;

    const feedback = await callLLM(evalPrompt);

    res.json({
      questionId,
      feedback: {
        score: feedback.score || 7,
        rating: feedback.rating || 'Good',
        key_strengths: feedback.key_strengths || ['Demonstrated understanding of core concepts.'],
        missing_points: feedback.missing_points || ['Could include more quantitative metrics.'],
        star_sample_answer: feedback.star_sample_answer || question.answer_outline
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
