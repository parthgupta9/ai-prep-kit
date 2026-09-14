/**
 * LLM Service with Token Bucket Rate Limiter, Exponential Backoff, & Fallback Handler
 * Supports Google Gemini API (@google/generative-ai) AND OpenRouter's OpenAI-compatible API.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

let lastCallTime = 0;
const MIN_INTERVAL_MS = 1200;

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

/**
 * Calls OpenRouter's OpenAI-compatible API with JSON mode & exponential backoff.
 */
async function callOpenRouter(apiKey, prompt, systemInstruction = '', jsonExpected = true) {
  let attempt = 0;
  const candidateModels = (process.env.OPENROUTER_MODELS || 'openai/gpt-4o-mini,openai/gpt-3.5-turbo')
    .split(',')
    .map(model => model.trim())
    .filter(Boolean);

  for (const modelName of candidateModels) {
    attempt = 0;
    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        await throttleRateLimit();

        const messages = [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: prompt });

        const body = {
          model: modelName,
          messages,
          temperature: 0.3
        };

        if (jsonExpected) {
          body.response_format = { type: 'json_object' };
        }

        const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', body, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...(process.env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL } : {}),
            ...(process.env.OPENROUTER_APP_NAME ? { 'X-Title': process.env.OPENROUTER_APP_NAME } : {})
          },
          timeout: 25000
        });

        const text = res.data?.choices?.[0]?.message?.content;
        if (jsonExpected) {
          return cleanAndParseJSON(text);
        }
        return text;
      } catch (err) {
        const errMsg = err.response?.data?.error?.message || err.message;
        console.warn(`[OpenRouter ${modelName} Attempt ${attempt}/${MAX_RETRIES} Failed]: ${errMsg}`);

        if (err.response?.status === 401 || errMsg.includes('Incorrect API key') || errMsg.includes('quota')) {
          console.error('[OpenRouter Auth Error]: Invalid API key or quota exceeded.');
          throw new Error(errMsg);
        }

        if (attempt < MAX_RETRIES) {
          const backoffMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise(res => setTimeout(res, backoffMs));
        }
      }
    }
  }

  throw new Error('OpenRouter API calls failed after retries.');
}

/**
 * Calls Google Gemini API (gemini-1.5-flash / gemini-2.0-flash) with rate limiting.
 */
async function callGemini(apiKey, prompt, systemInstruction = '', jsonExpected = true) {
  const candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

  for (const modelName of candidateModels) {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        await throttleRateLimit();

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: modelName,
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
        const errStr = err.message || '';
        console.warn(`[Gemini ${modelName} Attempt ${attempt}/${MAX_RETRIES} Failed]: ${errStr}`);

        if (errStr.includes('SERVICE_DISABLED') || errStr.includes('API_KEY_SERVICE_BLOCKED')) {
          console.error(`[Gemini Blocked]: Google Cloud project has disabled/blocked Gemini API.`);
          break;
        }

        if (attempt < MAX_RETRIES) {
          const backoffMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise(res => setTimeout(res, backoffMs));
        } else {
          break;
        }
      }
    }
  }

  throw new Error('Gemini API calls failed or service disabled.');
}

/**
 * Main unified LLM entry point. Supports OpenRouter, then Gemini, then offline fallback.
 */
async function callLLM(prompt, systemInstruction = '', jsonExpected = true) {
  const openRouterKey = process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.startsWith('sk-or-v1-') ? process.env.GEMINI_API_KEY : null);
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.LLM_API_KEY;

  // 1. Try OpenRouter if a provider key is present.
  if (openRouterKey) {
    try {
      console.log('[LLM Engine] Calling OpenRouter API...');
      return await callOpenRouter(openRouterKey, prompt, systemInstruction, jsonExpected);
    } catch (err) {
      console.warn(`[LLM OpenRouter Fallback Notice]: ${err.message}`);
    }
  }

  // 2. Try Gemini if key is present and starts with AIza
  if (geminiKey && geminiKey.startsWith('AIza')) {
    try {
      console.log('[LLM Engine] Calling Google Gemini API...');
      return await callGemini(geminiKey, prompt, systemInstruction, jsonExpected);
    } catch (err) {
      console.warn(`[LLM Gemini Fallback Notice]: ${err.message}`);
    }
  }

  // 3. Heuristic offline generator fallback
  console.log('[LLM Engine] Invoking offline heuristic fallback response.');
  return getFallbackResponse(prompt);
}

function getFallbackResponse(prompt) {
  const promptLower = prompt.toLowerCase();

  // Extract Requirements
  if (promptLower.includes('extract') || promptLower.includes('job description')) {
    return {
      title: 'Software Engineer',
      seniority: 'Mid-Senior',
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

  // Questions Prompt
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
