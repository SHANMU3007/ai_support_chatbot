/**
 * Enterprise PII (Personally Identifiable Information) Redaction Engine
 * 
 * Complies with enterprise privacy standards (GDPR, SOC-2, HIPAA principles)
 * by sanitizing sensitive identifiers in real-time before persistence or logging.
 */

// Regular expressions for detecting sensitive PII
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

// Visa, Mastercard, Amex, Discover, 13-19 digits with optional spaces or dashes
const CREDIT_CARD_REGEX = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11}|(?:[0-9]{4}[-\s]){3}[0-9]{4}|[0-9]{16})\b/g;

// International and US/India/UK phone number patterns
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b/g;

// US SSN or 9-digit Tax ID pattern
const SSN_REGEX = /\b\d{3}[-.\s]\d{2}[-.\s]\d{4}\b/g;

// API Keys, JWT Tokens, Bearer Tokens, Secret Keys
const API_KEY_REGEX = /\b(?:sk-[a-zA-Z0-9]{20,}|gsk_[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}|(?:bearer\s+)?[a-zA-Z0-9]{32,})\b/gi;

// Password patterns like "password: xyz", "pwd: xyz", "pass: xyz"
const PASSWORD_KV_REGEX = /(?:password|passwd|pwd|secret|token)\s*[:=]\s*['"]?([^\s'"]+)['"]?/gi;

/**
 * Sanitizes and masks PII in a given text string.
 */
export function sanitizePII(text: string | null | undefined): string {
  if (!text) return "";

  let sanitized = text;

  // 1. Redact API Keys / JWT Tokens
  sanitized = sanitized.replace(API_KEY_REGEX, "[REDACTED_API_KEY]");

  // 2. Redact Passwords / Secrets in key-value format
  sanitized = sanitized.replace(PASSWORD_KV_REGEX, (match, p1) => {
    return match.replace(p1, "[REDACTED_PASSWORD]");
  });

  // 3. Redact Credit Card Numbers
  sanitized = sanitized.replace(CREDIT_CARD_REGEX, "[REDACTED_CARD]");

  // 4. Redact SSN
  sanitized = sanitized.replace(SSN_REGEX, "[REDACTED_SSN]");

  // 5. Redact Email Addresses
  sanitized = sanitized.replace(EMAIL_REGEX, "[REDACTED_EMAIL]");

  // 6. Redact Phone numbers (filter out short digit matches that aren't phone numbers)
  sanitized = sanitized.replace(PHONE_REGEX, (match) => {
    const digitsOnly = match.replace(/\D/g, "");
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return "[REDACTED_PHONE]";
    }
    return match;
  });

  return sanitized;
}

/**
 * Helper to sanitize an array of chat messages for feedback ticket context attachments.
 */
export function sanitizeChatHistory(
  messages: Array<{ role: string; content: string }>
): string {
  if (!messages || messages.length === 0) return "";

  return messages
    .slice(-4) // take at most last 4 messages
    .map((m) => {
      const roleLabel = m.role === "user" || m.role === "USER" ? "User" : "Assistant";
      return `${roleLabel}: ${sanitizePII(m.content)}`;
    })
    .join("\n\n");
}
