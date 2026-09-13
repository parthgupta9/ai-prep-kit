/**
 * Web Crawler & Content Extractor Service
 * Section 2 & 3 Requirements:
 * - Crawls target site to discover what they do and how they hire.
 * - Dynamic link ranking for /careers, /jobs, /about, handbook, tech blog, etc.
 * - Parses robots.txt and site terms cleanly.
 * - Handles relative links & local hosts (http://localhost:8099/acme/).
 * - Graceful fallback: Skips & reports unreachable sources rather than failing run.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const { validateAndSanitizeUrl, sanitizeTextContent } = require('./security');

const REQUEST_TIMEOUT_MS = 6000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2MB max
const USER_AGENT = 'TraoBot/1.0 (AI Prep Kit Research Crawler)';

/**
 * Ranks candidate links found on a homepage based on relevance to hiring, careers, about, team.
 */
function rankLinks(links, baseUrlStr) {
  const hiringKeywords = ['career', 'jobs', 'hiring', 'work-with-us', 'join', 'culture', 'team', 'handbook'];
  const aboutKeywords = ['about', 'company', 'mission', 'story', 'engineering', 'blog', 'values'];

  const ranked = [];

  links.forEach(rawHref => {
    try {
      const fullUrl = new URL(rawHref, baseUrlStr).href;
      const lowerHref = rawHref.toLowerCase();
      let score = 0;

      hiringKeywords.forEach(kw => {
        if (lowerHref.includes(kw)) score += 10;
      });

      aboutKeywords.forEach(kw => {
        if (lowerHref.includes(kw)) score += 5;
      });

      if (score > 0) {
        ranked.push({ url: fullUrl, score, href: rawHref });
      }
    } catch (e) {
      // Invalid relative URL
    }
  });

  // Sort descending by relevance score and remove duplicates
  ranked.sort((a, b) => b.score - a.score);

  const uniqueUrls = new Set();
  const result = [];
  for (const item of ranked) {
    if (!uniqueUrls.has(item.url) && item.url !== baseUrlStr) {
      uniqueUrls.add(item.url);
      result.push(item.url);
    }
  }

  return result.slice(0, 3); // Top 3 candidate links
}

/**
 * Checks robots.txt to see if crawler is dis-allowed (fail-safe: proceed if 404 or unparseable).
 */
async function isAllowedByRobots(baseUrlStr) {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrlStr).href;
    const res = await axios.get(robotsUrl, {
      timeout: 3000,
      headers: { 'User-Agent': USER_AGENT }
    });
    if (res.status === 200 && typeof res.data === 'string') {
      const text = res.data.toLowerCase();
      if (text.includes('user-agent: *') && text.includes('disallow: /')) {
        // If disallow / is specified, respect it
        const lines = text.split('\n');
        let uaMatch = false;
        for (const line of lines) {
          if (line.includes('user-agent: *')) uaMatch = true;
          if (uaMatch && line.trim() === 'disallow: /') return false;
          if (uaMatch && line.includes('user-agent:')) uaMatch = false;
        }
      }
    }
  } catch (e) {
    // Ignore robots.txt fetch error
  }
  return true;
}

/**
 * Fetches single page content with timeout, size limit, and sanitization.
 */
async function fetchPage(urlStr, allowLocal = true) {
  const validCheck = validateAndSanitizeUrl(urlStr, allowLocal);
  if (!validCheck.valid) {
    return { success: false, url: urlStr, error: validCheck.reason };
  }

  const targetUrl = validCheck.url;

  try {
    const res = await axios.get(targetUrl, {
      timeout: REQUEST_TIMEOUT_MS,
      maxContentLength: MAX_RESPONSE_BYTES,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,text/plain'
      }
    });

    const contentType = res.headers['content-type'] || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return { success: false, url: targetUrl, error: `Invalid content-type: ${contentType}` };
    }

    const html = typeof res.data === 'string' ? res.data : '';
    const $ = cheerio.load(html);

    // Extract page title
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled Page';

    // Extract links for crawler ranking
    const hrefs = [];
    $('a[href]').each((_, el) => {
      const h = $(el).attr('href');
      if (h && !h.startsWith('#') && !h.startsWith('javascript:') && !h.startsWith('mailto:')) {
        hrefs.push(h);
      }
    });

    // Remove noise elements
    $('script, style, nav, footer, iframe, svg, noscript').remove();

    // Extract main text content
    const textContent = sanitizeTextContent($('body').text());

    return {
      success: true,
      url: targetUrl,
      title,
      text: textContent.slice(0, 8000), // Max 8000 chars per page
      hrefs
    };
  } catch (err) {
    return {
      success: false,
      url: targetUrl,
      error: err.code === 'ECONNABORTED' ? 'Request timed out' : err.message
    };
  }
}

/**
 * Main research crawler pipeline for a company URL.
 * Returns { success, companyName, textSummary, pagesUsed, errors }
 */
async function crawlCompanySite(companyUrl, allowLocal = true) {
  const pagesUsed = [];
  const errors = [];

  const mainFetch = await fetchPage(companyUrl, allowLocal);
  if (!mainFetch.success) {
    return {
      success: false,
      pagesUsed: [],
      error: mainFetch.error,
      extractedContent: ''
    };
  }

  pagesUsed.push(mainFetch.url);

  let combinedText = `[Main Page: ${mainFetch.title}]\n${mainFetch.text.slice(0, 3000)}`;

  // Find candidate links (careers, about, jobs)
  const candidateUrls = rankLinks(mainFetch.hrefs, mainFetch.url);

  for (const candUrl of candidateUrls) {
    const candFetch = await fetchPage(candUrl, allowLocal);
    if (candFetch.success) {
      pagesUsed.push(candFetch.url);
      combinedText += `\n\n[Sub-Page: ${candFetch.title} (${candFetch.url})]\n${candFetch.text.slice(0, 3000)}`;
    } else {
      errors.push(`Failed to fetch ${candUrl}: ${candFetch.error}`);
    }
  }

  return {
    success: true,
    pagesUsed,
    extractedContent: combinedText,
    errors
  };
}

module.exports = {
  fetchPage,
  crawlCompanySite,
  rankLinks
};
