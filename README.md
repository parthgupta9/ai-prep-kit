# Trao AI Interview Prep Kit

A full-stack web application and batch CLI pipeline that transforms any job description and company website URL into a personalized, structured interview preparation kit—complete with automated company research, multi-pass requirement coverage verification, deterministic schedule allocation, interactive builder with edit-preservation, practice mode, and an AI mock interview simulator.

---

## 🌟 Architecture & Key Features

```
+-----------------------------------------------------------------------------------+
|                                  USER / BATCH CLI                                 |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        RESEARCH & GENERATION PIPELINE                             |
|                                                                                   |
|  1. URL Security & SSRF Defense (Blocks private/loopback IPs in prod; permits      |
|     localhost during evaluation mode)                                             |
|  2. Web Research & Site Crawling (robots.txt, dynamic candidate link ranker,      |
|     Cheerio text extractor, graceful fallback for 404/unreachable URLs)           |
|  3. Requirement Extraction (LLM -> stable IDs r1, r2..., technical/behavioural,   |
|     must/nice priority tagging)                                                   |
|  4. Company Brief & Interview Process Synthesis (LLM -> summary, what_they_do)    |
|  5. Question & Flashcard Generation (LLM -> technical/behavioural/system-design)  |
|  6. DETERMINISTIC COVERAGE CHECK & 2ND PASS LOOP (Code checks Must-Have coverage) |
|  7. DETERMINISTIC SCHEDULE ALLOCATION (Code distributes material across N days)   |
|  8. Appendix A Kit Validation (Zod schema validation)                             |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                       FRONTEND BUILDER & PRACTICE MODE                            |
|  - Reshapeable Kit Builder (Inline edit, drag/move, add, delete, section regen)   |
|  - Edit Preservation Engine (Tracks isEdited/isPinned state across regenerations)  |
|  - Flashcard Practice Mode (Spaced-repetition confidence rating queue)            |
|  - Interactive AI Mock Interview Simulator (Creative Feature)                     |
+-----------------------------------------------------------------------------------+
```

---

## 🛠️ Tech Stack & Justification

- **Frontend**: Next.js / React 19 + TypeScript + Tailwind CSS + Lucide Icons. (Fast, responsive, keyboard-accessible UI with real-time state management).
- **Backend**: Node.js + Express + Mongoose (MongoDB) / In-Memory Persistence Fallback.
- **Scraping & Crawling**: Axios + Cheerio + URL Ranker + `robots.txt` Parser.
- **LLM Provider**: Google Gemini API (`gemini-1.5-flash`). Free tier with generous rate limits, built-in token-bucket rate limiter, exponential backoff retries, and structured JSON output parsing.
- **Validation**: Zod (strict Appendix A schema enforcement).
- **Testing**: Jest + Supertest.

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
```bash
# Clone the repository
git clone https://github.com/parthgupta9/ai-prep-kit.git
cd ai-prep-kit

# Install backend dependencies
cd backend && npm install
cd ..

# Install frontend dependencies
cd frontend && npm install
cd ..
```

### Environment Configuration
Copy `.env.example` to `.env` in the root and backend folders:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/trao_interview_prep
JWT_SECRET=trao_super_secret_jwt_key_2026
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=development
```

---

## ⚡ Mandatory Batch Entry Point (Section 9)

Run the mandatory evaluation command from the root repository directory:

```bash
npm run evaluate -- --input sample_cases.json --output test_kits.json
```

### Batch Input File (`cases.json` - Appendix B):
```json
[
  {
    "id": "case-01",
    "jd": "Senior Backend Engineer\n\nWe are looking for Node.js experience...",
    "company_url": "https://posthog.com",
    "days": 5
  }
]
```

### Batch Output File (`kits.json` - Appendix B):
Conforms strictly to Appendix B JSON format containing array of generated kits matching Appendix A structure.

---

## 🧪 Running Automated Tests

Run the test suite for schedule allocation, coverage checking, and schema validation:

```bash
cd backend
npm test
```

---

## 📖 System Design & Brief Answers

### 1. Research & Generation Sequencing
The pipeline executes in genuine deliberate steps:
1. **Extraction**: Extract requirements, seniority, and responsibilities from raw JD text. Each requirement receives a stable ID (`r1`, `r2`...), kind (`technical`, `behavioural`, `domain`), and priority (`must` vs `nice`).
2. **Retrieval**: Crawl company domain, rank links dynamically (`/careers`, `/jobs`, `about`, `blog`, `handbook`), parse `robots.txt`, and sanitize page text.
3. **Synthesis**: Synthesize company brief and hiring process overview.
4. **Generation**: Generate categorized questions (`technical`, `behavioural`, `system-design`, `company-fit`) referencing requirement IDs.
5. **Coverage Loop**: Deterministically compare questions against `must` requirements. If gaps exist, trigger Pass 2 generation for missing requirements.
6. **Schedule Allocation**: Deterministic algorithm allocates material across requested $N$ days.

### 2. Deterministic vs Model Responsibilities
- **Model**: Requirements extraction, text synthesis, initial question & flashcard drafting, mock interview evaluation.
- **Code (Deterministic)**:
  - **Coverage Checker**: Compares extracted requirement IDs against question requirement references.
  - **Preparation Schedule Allocator**: Distributes material across $N$ days, frontloads hard/must-have topics to early days, and calculates integer duration minutes.
  - **URL Sanitization & SSRF Defense**: Validates external URLs and rejects private IP ranges in production.

### 3. Builder State & Edit Preservation (Section 6)
When a user edits a question or adds a custom item, the frontend flags `isEdited: true` or `isPinned: true`. When "Regenerate Section" is invoked (e.g. for a category or brief):
- Pinned and edited items are preserved without alteration.
- Only un-pinned/un-edited generated items in that section are replaced.

### 4. Practice Mode & Creative Feature (Section 7 & Creative)
- **Practice Mode**: Flashcards flip to reveal answers with 1..3 confidence ratings (Hard, Medium, Easy). Cards are ordered dynamically using a spaced-repetition queue prioritizing unrated and low-confidence items.
- **Creative Feature (AI Mock Interview Simulator)**: Users can select any question in their kit, type or record their response, and receive real-time AI scoring (1-10 rating, key strengths, missing points, and a model STAR answer).

---

## 🛡️ Edge Cases & Robustness

- **Invalid / 404 Company URLs**: Skips unreachable URLs safely, logs the error, and generates an honest company brief stating site was unreachable without failing the run.
- **Thin JDs**: Processes short JDs honestly without inventing non-existent requirements.
- **LLM Rate Limits (429/503)**: Handled via token-bucket request throttling, exponential backoff retries, and offline heuristic fallback generators.
- **1-Day or 60-Day Schedules**: Handled cleanly by the deterministic schedule allocator.
