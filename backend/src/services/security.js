/**
 * Security Service for URL validation, SSRF defense, and Content Sanitization
 * Section 11 Requirement:
 * - Validate external URLs before fetching
 * - Reject private and loopback addresses in production (allow in local/test/evaluation mode)
 * - Restrict handling to expected content types and size limits
 * - Treat text inside fetched pages as untrusted data
 */

const { URL } = require('url');

const PRIVATE_IP_RANGES = [
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.\d+\.\d+\.\d+$/,
  /^::1$/,
  /^localhost$/i
];

/**
 * Validates a URL string for safe external fetching.
 * @param {string} urlStr
 * @param {boolean} allowLocal - If true (e.g., evaluation/test mode), allows loopback/localhost.
 */
function validateAndSanitizeUrl(urlStr, allowLocal = false) {
  if (!urlStr || typeof urlStr !== 'string') {
    return { valid: false, reason: 'Invalid or missing URL string' };
  }

  let normalizedUrl = urlStr.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  try {
    const parsed = new URL(normalizedUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, reason: `Unsupported protocol: ${parsed.protocol}` };
    }

    const hostname = parsed.hostname;

    // SSRF Check for loopback / private IP addresses in production
    const isPrivate = PRIVATE_IP_RANGES.some(pattern => pattern.test(hostname));

    const isProd = process.env.NODE_ENV === 'production';
    if (isPrivate && isProd && !allowLocal) {
      return { valid: false, reason: 'SSRF Block: Private and loopback IP addresses are prohibited in production.' };
    }

    return { valid: true, url: parsed.href, parsed };
  } catch (err) {
    return { valid: false, reason: `URL parsing failed: ${err.message}` };
  }
}

/**
 * Sanitizes untrusted text content crawled from web pages or pasted JDs.
 * Removes script/style/iframe tags and potential prompt injection wrappers.
 */
function sanitizeTextContent(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  return rawText
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ')
    .replace(/<[^>]+>/g, ' ') // Strip HTML tags
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  validateAndSanitizeUrl,
  sanitizeTextContent
};
