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
export function getPublicUrl(req: NextRequest, expectedUrl?: string): string {
  if (expectedUrl) {
    return expectedUrl;
  }

  const base = process.env.TWILIO_WEBHOOK_BASE_URL?.replace(/\/$/, "");
  
  // Many proxies (or Vercel internal routing) mangle request.url / nextUrl.
  // Fallback to headers if base is strictly not defined
  let pathWithQuery = (req.headers.get("x-invoke-path") || req.nextUrl.pathname) + req.nextUrl.search;

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
 */
export function verifyTwilioRequest(
  req: NextRequest,
  rawBody: string = "",
  formParams: Record<string, string> = {},
  expectedUrl?: string
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

  const url = getPublicUrl(req, expectedUrl);
  const contentType = req.headers.get("content-type") ?? "";

  // 6) Adicionar logs temporários para diagnóstico
  logger.info("twilio_signature_diagnostic", {
    pathname: req.nextUrl.pathname,
    hostHeader: req.headers.get("host"),
    xForwardedHost: req.headers.get("x-forwarded-host"),
    xForwardedProto: req.headers.get("x-forwarded-proto"),
    validationUrl: url,
    hasTwilioSignature: !!signature,
    contentType,
  });

  if (!signature) {
    return false;
  }

  try {
    if (contentType.includes("application/json")) {
      return validateRequestWithBody(authToken, signature, url, rawBody);
    }
    return validateRequest(authToken, signature, url, formParams);
  } catch (err) {
    logger.warn("Twilio signature validation threw unexpectedly", {
      event: "TWILIO_VERIFY_ERROR",
      validationUrl: url,
      errorMessage: (err as Error).message,
    });
    return false;
  }
}
