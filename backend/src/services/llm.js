/**
 * LLM Service with Token Bucket Rate Limiter, Exponential Backoff, & Fallback Handler
 * Supports Google Gemini API (@google/generative-ai)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

let lastCallTime = 0;
const MIN_INTERVAL_MS = 1500;

async function throttleRateLimit() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_INTERVAL_MS) {
    const waitMs = MIN_INTERVAL_MS - elapsed;
    await new Promise(res => setTimeout(res, waitMs));
  }
  lastCallTime = Date.now();
}

function cleanAndParseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response from LLM');
  }

  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (innerErr) {
        throw new Error(`Failed to parse extracted JSON: ${innerErr.message}`);
      }
    }
    throw new Error(`LLM output is not valid JSON: ${err.message}. Raw text: ${cleaned.slice(0, 150)}...`);
  }
}

async function callLLM(prompt, systemInstruction = '', jsonExpected = true) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return getFallbackResponse(prompt);
  }

  let attempt = 0;
  let lastError = null;

  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      await throttleRateLimit();

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: systemInstruction || undefined,
        generationConfig: jsonExpected ? { responseMimeType: 'application/json' } : undefined
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (jsonExpected) {
        return cleanAndParseJSON(text);
      }
      return text;
    } catch (err) {
      lastError = err;
      const isRateLimit = err.status === 429 || (err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('slow down')));
      const isTransient = err.status === 503 || (err.message && err.message.includes('503'));

      console.warn(`[LLM Attempt ${attempt}/${MAX_RETRIES} Failed]: ${err.message}`);

      if ((isRateLimit || isTransient) && attempt < MAX_RETRIES) {
        const backoffMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise(res => setTimeout(res, backoffMs));
      } else {
        break;
      }
    }
  }

  console.error(`[LLM Fatal] Falling back to heuristic generator.`);
  return getFallbackResponse(prompt);
}

function getFallbackResponse(prompt) {
  const promptLower = prompt.toLowerCase();

  // Extract Requirements
  if (promptLower.includes('extract') || promptLower.includes('job description')) {
    return {
      title: 'Senior Software Engineer',
      seniority: 'Senior',
      responsibilities: [
        'Design, build, and maintain scalable software services',
        'Collaborate with cross-functional teams to define requirements and deliverables',
        'Participate in code reviews, testing, and technical documentation'
      ],
      requirements: [
        { id: 'r1', text: '5+ years experience in Node.js / React software development', kind: 'technical', priority: 'must' },
        { id: 'r2', text: 'System architecture & database scalability', kind: 'technical', priority: 'must' },
        { id: 'r3', text: 'Cross-functional team collaboration & communication', kind: 'behavioural', priority: 'nice' }
      ]
    };
  }

  // Company Brief
  if (promptLower.includes('company brief') || promptLower.includes('crawled web page')) {
    return {
      summary: 'Target technology organization providing software products.',
      what_they_do: 'Develops enterprise digital products and modern cloud software infrastructure.'
    };
  }

  // Questions Prompt (matches "question" or "questions")
  if (promptLower.includes('question') || promptLower.includes('questions')) {
    return [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Describe your experience building asynchronous backend services and managing event-driven workflows.',
        answer_outline: 'Explain architectural design, async error handling, concurrency management, and performance monitoring.',
        difficulty: 2
      },
      {
        id: 'q2',
        requirement_ids: ['r2'],
        category: 'system-design',
        prompt: 'How would you design a high-throughput, fault-tolerant API service with database caching?',
        answer_outline: 'Cover load balancing, Redis caching strategies, database indexing, and failover mechanisms.',
        difficulty: 3
      },
      {
        id: 'q3',
        requirement_ids: ['r3'],
        category: 'behavioural',
        prompt: 'Tell me about a time you had to balance technical debt against urgent product deadlines.',
        answer_outline: 'Use STAR method: Describe Situation, Task, Action taken with stakeholders, and Result.',
        difficulty: 1
      }
    ];
  }

  // Flashcards
  if (promptLower.includes('flashcard') || promptLower.includes('flashcards')) {
    return [
      {
        id: 'f1',
        front: 'What are key strategies for database indexing in Node.js services?',
        back: 'Use B-Tree or Hash indexes on frequently queried columns, avoid over-indexing write-heavy collections.',
        requirement_ids: ['r2']
      },
      {
        id: 'f2',
        front: 'What is the STAR method for behavioural interview questions?',
        back: 'Situation, Task, Action, and Result.',
        requirement_ids: ['r3']
      }
    ];
  }

  return { status: 'fallback', note: 'Generated fallback content' };
}

module.exports = {
  callLLM,
  cleanAndParseJSON
};
