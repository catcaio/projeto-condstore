/**
 * Twilio Webhook Signature Verification Helper.
 *
 * Provides two functions:
 *  - getPublicUrl       — reconstructs the exact URL Twilio used to call the webhook.
 *  - verifyTwilioRequest — validates X-Twilio-Signature for form and JSON bodies.
 *
 * References:
 *  https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */

import { validateRequest, validateRequestWithBody } from "twilio";
import type { NextRequest } from "next/server";
import { logger } from "../../infra/logger";

/**
 * Reconstruct the public URL that Twilio used when calling this webhook.
 *
 * Priority:
 *  1. TWILIO_WEBHOOK_BASE_URL env  (e.g. "https://example.com") + pathname + search.
 *     Use this in production / behind proxies where forwarded headers are unreliable.
 *  2. x-forwarded-proto + x-forwarded-host (or host) headers + pathname + search.
 *     Works well with ngrok, Vercel and other reverse-proxy setups that set these headers.
 *
 * The search part (query string) is preserved because Twilio appends
 * ?bodySHA256=<hash> to the URL for JSON webhooks before signing.
 */
export function getPublicUrl(req: NextRequest): string {
  const pathWithQuery = req.nextUrl.pathname + req.nextUrl.search;

  if (process.env.NODE_ENV === 'production') {
    const base = process.env.APP_BASE_URL;
    if (!base) {
      throw new Error("APP_BASE_URL is required in production");
    }
    return base.replace(/\/$/, "") + pathWithQuery;
  }

  const base = process.env.APP_BASE_URL || process.env.TWILIO_WEBHOOK_BASE_URL;

  if (base) {
    return base.replace(/\/$/, "") + pathWithQuery;
  }

  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "localhost:3000";

  return `${proto}://${host}${pathWithQuery}`;
}

/**
 * Verify the X-Twilio-Signature header on an incoming webhook request.
 *
 * @param req        - The incoming Next.js request object.
 * @param rawBody    - Raw request body string (already read with req.text()).
 *                     For form-urlencoded: the encoded query string.
 *                     For JSON: the raw JSON string.
 *                     Defaults to "" when not provided.
 * @param formParams - Parsed form parameters as flat key→value map.
 *                     Required for form-urlencoded validation; ignored for JSON.
 *                     Defaults to {} when not provided.
 *
 * Dispatches to the correct Twilio library function:
 *   • application/json  → validateRequestWithBody(authToken, sig, url, rawBody)
 *     Twilio appends ?bodySHA256=<hash> to the URL; the full URL with search is used.
 *   • form-urlencoded   → validateRequest(authToken, sig, url, formParams)
 *
 * Returns false (never throws) on any failure:
 *   • missing TWILIO_AUTH_TOKEN (logs a warning — never logs the token value)
 *   • missing X-Twilio-Signature header
 *   • HMAC mismatch or body-hash mismatch
 *   • unexpected internal error (logs only proto/host/path for diagnosis)
 */
export function verifyTwilioRequest(
  req: NextRequest,
  rawBody: string = "",
  formParams: Record<string, string> = {}
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    logger.warn(
      "TWILIO_AUTH_TOKEN not set — cannot verify webhook signature",
      { event: "TWILIO_VERIFY_MISCONFIGURED" }
    );
    return false;
  }

  const signature = req.headers.get("x-twilio-signature");

  if (!signature) {
    return false;
  }

  const url = getPublicUrl(req);
  const contentType = req.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      // JSON webhook: Twilio appends ?bodySHA256=<hash> to the URL before signing.
      // validateRequestWithBody validates both the HMAC-SHA1 and the body SHA256.
      return validateRequestWithBody(authToken, signature, url, rawBody);
    }

    // Default: application/x-www-form-urlencoded (all Twilio WhatsApp webhooks)
    return validateRequest(authToken, signature, url, formParams);
  } catch (err) {
    // Log diagnostic context without leaking the auth token or raw body.
    logger.warn("Twilio signature validation threw unexpectedly", {
      event: "TWILIO_VERIFY_ERROR",
      proto: req.headers.get("x-forwarded-proto"),
      host:
        req.headers.get("x-forwarded-host") ?? req.headers.get("host"),
      path: req.nextUrl.pathname,
      contentType,
      errorMessage: (err as Error).message,
    });
    return false;
  }
}
