/**
 * Utility functions for API URL normalization and auto-environment detection.
 */

/**
 * Returns the appropriate FastAPI backend URL based on environment:
 * - Local development (`npm run dev`): connects to `http://localhost:8000`
 * - Production / Hosting (Vercel / Railway): connects to `FASTAPI_URL` or Railway production endpoint.
 */
export function getFastApiUrl(path: string = ""): string {
  const isLocalDev =
    process.env.NODE_ENV === "development" && !process.env.VERCEL;

  let baseUrl = isLocalDev
    ? process.env.FASTAPI_DEV_URL || "http://localhost:8000"
    : process.env.FASTAPI_URL || "https://aisupportchatbot-production.up.railway.app";

  baseUrl = baseUrl.trim();

  // If missing protocol prefix, default to https:// (or http:// for localhost)
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
