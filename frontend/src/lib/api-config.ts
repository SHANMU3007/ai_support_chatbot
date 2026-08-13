/**
 * Utility functions for API URL normalization and validation.
 */

/**
 * Returns a normalized FastAPI backend URL for any route path.
 * Solves ERR_INVALID_URL issues if FASTAPI_URL is missing http(s):// protocol.
 */
export function getFastApiUrl(path: string = ""): string {
  let baseUrl = process.env.FASTAPI_URL || "http://localhost:8000";
  baseUrl = baseUrl.trim();

  // If missing protocol prefix, default to https:// (or http:// for localhost/127.0.0.1)
  if (!/^https?:\/\//i.test(baseUrl)) {
    if (baseUrl.startsWith("localhost") || baseUrl.startsWith("127.0.0.1")) {
      baseUrl = `http://${baseUrl}`;
    } else {
      baseUrl = `https://${baseUrl}`;
    }
  }

  // Remove trailing slashes
  baseUrl = baseUrl.replace(/\/+$/, "");

  // Ensure path starts with leading slash if provided
  const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";

  return `${baseUrl}${cleanPath}`;
}

/**
 * Normalizes user-entered website URLs for web crawling.
 * Supports all hosted websites, adding https:// if missing, and validating format.
 */
export function normalizeWebsiteUrl(rawUrl: string): string {
  if (!rawUrl) throw new Error("URL is required");
  let url = rawUrl.trim();

  // If protocol missing, default to https://
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname || (!parsed.hostname.includes(".") && parsed.hostname !== "localhost")) {
      throw new Error("Invalid domain format");
    }
    return parsed.toString();
  } catch {
    throw new Error("Invalid URL format");
  }
}
