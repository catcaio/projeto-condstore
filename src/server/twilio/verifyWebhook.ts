/**
 * Twilio Webhook Signature Verification Helper.
 *
 * Provides two functions:
 *  - getPublicUrl        — reconstructs the exact URL Twilio used to call the webhook.
 *  - verifyTwilioRequest — validates X-Twilio-Signature for form-urlencoded bodies.
 *
 * References:
 *  https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */

import { validateRequest } from "twilio";
import type { NextRequest } from "next/server";
import { logger } from "../../infra/logger";

/**
 * Reconstruct the public URL that Twilio used when calling this webhook.
 *
 * Priority:
 *  1. TWILIO_WEBHOOK_BASE_URL env (e.g. "https://example.com") + pathname + search.
 *     Use this in production / behind proxies where forwarded headers are unreliable.
 *     Trailing slash is stripped automatically.
 *  2. x-forwarded-proto + x-forwarded-host (or host) headers + pathname + search.
 *     Works well with ngrok, Vercel and other reverse-proxy setups that set these headers.
 */
export function getPublicUrl(req: NextRequest): string {
  const base = process.env.TWILIO_WEBHOOK_BASE_URL?.replace(/\/$/, "");
  const pathWithQuery = req.nextUrl.pathname + req.nextUrl.search;

  if (base) {
    return base + pathWithQuery;
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
 *                     Defaults to "" when not provided.
 * @param formParams - Parsed form parameters as flat key→value map.
 *                     Defaults to {} when not provided.
 *
 * Only application/x-www-form-urlencoded is supported (the only format sent
 * by Twilio WhatsApp). Requests with other Content-Types must be rejected by
 * the caller before reaching this function.
 *
 * Returns false (never throws) on any failure:
 *   • TWILIO_AUTH_TOKEN absent when validation is enabled (logs a safe warning)
 *   • missing X-Twilio-Signature header
 *   • HMAC mismatch
 *   • unexpected internal error (logs only proto/host/path — never the token or body)
 */
export function verifyTwilioRequest(
  req: NextRequest,
  rawBody: string = "",
  formParams: Record<string, string> = {}
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    logger.warn(
      "TWILIO_AUTH_TOKEN not set — signature validation is enabled but cannot run",
      { event: "TWILIO_VERIFY_MISCONFIGURED" }
    );
    return false;
  }

  const signature = req.headers.get("x-twilio-signature");

  if (!signature) {
    return false;
  }

  const url = getPublicUrl(req);

  try {
    return validateRequest(authToken, signature, url, formParams);
  } catch (err) {
    // Log safe diagnostic context — never the auth token, raw body, or form values.
    logger.warn("Twilio signature validation threw unexpectedly", {
      event: "TWILIO_VERIFY_ERROR",
      proto: req.headers.get("x-forwarded-proto"),
      host:
        req.headers.get("x-forwarded-host") ?? req.headers.get("host"),
      path: req.nextUrl.pathname,
      errorMessage: (err as Error).message,
    });
    return false;
  }
}
