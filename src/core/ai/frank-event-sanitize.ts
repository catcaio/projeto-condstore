const MASK_PHONE = '***PHONE***';
const MASK_EMAIL = '***EMAIL***';
const MASK_SECRET = '***SECRET***';
const MAX_TEXT_CHARS = 2000;
const MAX_MESSAGES = 12;

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL_RE = /\b(?:https?|mysql):\/\/[^\s"'`]+/gi;
const OPENAI_KEY_RE = /\bsk-[A-Za-z0-9_-]+\b/g;
const URL_DETECT_RE = /\b(?:https?|mysql):\/\/[^\s"'`]+/i;
const OPENAI_KEY_DETECT_RE = /\bsk-[A-Za-z0-9_-]+\b/i;
const SECRET_VALUE_RE = /(api[_-]?key|bearer|token|secret|database_url|auth_secret)/i;
const SECRET_KEY_RE = /(api[_-]?key|bearer|token|secret|database_url|auth_secret|env|headers?)/i;
const ALLOW_HASH_KEY_RE = /^(phoneHash|phone_hash|sessionId|session_id|correlationId|correlation_id)$/i;
const DROP_METADATA_KEY_RE = /^(userId|user_id|phone|phoneNumber|phone_number|from|to|whatsapp|email)$/i;

// E.164-ish (8 to 15 digits) and BR local formats with punctuation/spaces.
const PHONE_PATTERNS: RegExp[] = [
  /\+?[1-9]\d{7,14}/g,
  /(?:\+?55[\s-]?)?(?:\(?\d{2}\)?[\s-]?)?(?:9?\d{4})[\s-]?\d{4}/g,
];

export interface SanitizedToolCall {
  name: string;
  latency_ms?: number;
  ok?: boolean;
}

export interface SanitizedMessage {
  role?: string;
  text?: string;
}

export interface SanitizedPayload {
  userText?: string;
  systemText?: string;
  assistantText?: string;
  messagesCount?: number;
  messages?: SanitizedMessage[];
  toolCalls?: SanitizedToolCall[];
  route?: string;
  metadata?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function truncateText(value: string, maxChars = MAX_TEXT_CHARS): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}...[truncated]`;
}

function maskPhonesAndEmails(text: string): string {
  let out = text.replace(EMAIL_RE, MASK_EMAIL);
  for (const re of PHONE_PATTERNS) {
    out = out.replace(re, (match) => {
      const digits = match.replace(/\D/g, '');
      return digits.length >= 8 ? MASK_PHONE : match;
    });
  }
  return out;
}

function isSecretString(text: string): boolean {
  if (SECRET_VALUE_RE.test(text)) return true;
  if (URL_DETECT_RE.test(text)) return true;
  if (OPENAI_KEY_DETECT_RE.test(text)) return true;
  if (/DATABASE_URL\s*=|AUTH_SECRET\s*=|MYSQL_URL\s*=|postgres:\/\/|mysql2?:\/\//i.test(text)) return true;
  // "env dump" heuristic: many KEY=VALUE pairs or typical env-list markers
  if ((text.match(/\b[A-Z0-9_]{2,}\s*=/g) ?? []).length >= 2) return true;
  return false;
}

function sanitizeString(text: string, options?: { maxChars?: number; allowUrls?: boolean }): string {
  if (!text) return text;
  if (!options?.allowUrls && isSecretString(text)) {
    return MASK_SECRET;
  }

  let out = text;
  out = out.replace(URL_RE, MASK_SECRET);
  out = out.replace(OPENAI_KEY_RE, MASK_SECRET);
  out = out.replace(/\bBearer\s+[A-Za-z0-9._-]+\b/gi, MASK_SECRET);
  out = out.replace(/\b(DATABASE_URL|AUTH_SECRET)\s*=\s*[^,\s]+/gi, MASK_SECRET);
  out = maskPhonesAndEmails(out);
  return truncateText(out, options?.maxChars ?? MAX_TEXT_CHARS);
}

function toOptionalString(value: unknown, maxChars = MAX_TEXT_CHARS): string | undefined {
  if (typeof value !== 'string') return undefined;
  const sanitized = sanitizeString(value, { maxChars });
  return sanitized.length > 0 ? sanitized : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.trunc(value);
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return undefined;
}

function sanitizeToolCalls(value: unknown): SanitizedToolCall[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const sanitized = value
    .map((item): SanitizedToolCall | null => {
      if (!isRecord(item)) return null;
      const name =
        (typeof item.name === 'string' && item.name) ||
        (isRecord(item.function) && typeof item.function.name === 'string' ? item.function.name : undefined) ||
        (typeof item.toolName === 'string' && item.toolName) ||
        undefined;

      if (!name) return null;

      const latency =
        toOptionalNumber(item.latency_ms) ??
        toOptionalNumber(item.latencyMs);

      const ok =
        toOptionalBoolean(item.ok) ??
        (typeof item.status === 'string'
          ? item.status.toLowerCase() === 'ok'
          : undefined);

      return {
        name: sanitizeString(name, { maxChars: 120, allowUrls: false }),
        ...(latency !== undefined ? { latency_ms: latency } : {}),
        ...(ok !== undefined ? { ok } : {}),
      };
    })
    .filter((item): item is SanitizedToolCall => item !== null);

  return sanitized;
}

function sanitizeMessages(value: unknown): SanitizedMessage[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const last = value.slice(-MAX_MESSAGES);
  const sanitized = last
    .map((item): SanitizedMessage | null => {
      if (typeof item === 'string') {
        return { text: sanitizeString(item, { maxChars: MAX_TEXT_CHARS }) };
      }
      if (!isRecord(item)) return null;

      const role = typeof item.role === 'string' ? sanitizeString(item.role, { maxChars: 40 }) : undefined;
      const textSource =
        typeof item.text === 'string' ? item.text :
          typeof item.content === 'string' ? item.content :
            typeof item.body === 'string' ? item.body :
              undefined;
      const text = textSource ? sanitizeString(textSource, { maxChars: MAX_TEXT_CHARS }) : undefined;

      if (!role && !text) return null;
      return {
        ...(role ? { role } : {}),
        ...(text ? { text } : {}),
      };
    })
    .filter((item): item is SanitizedMessage => item !== null);

  return sanitized.length > 0 ? sanitized : undefined;
}

function sanitizeMetadataValue(value: unknown, keyPath: string[] = []): unknown {
  const currentKey = keyPath[keyPath.length - 1] ?? '';

  if (SECRET_KEY_RE.test(currentKey) && !ALLOW_HASH_KEY_RE.test(currentKey)) {
    return MASK_SECRET;
  }

  if (DROP_METADATA_KEY_RE.test(currentKey) && !ALLOW_HASH_KEY_RE.test(currentKey)) {
    return undefined;
  }

  if (typeof value === 'string') {
    return sanitizeString(value, { maxChars: 500 });
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    const isMessagesArray = currentKey.toLowerCase() === 'messages';
    const isToolCallsArray = currentKey.toLowerCase() === 'toolcalls' || currentKey.toLowerCase() === 'tool_calls';
    if (isMessagesArray) {
      return sanitizeMessages(value);
    }
    if (isToolCallsArray) {
      return sanitizeToolCalls(value);
    }
    return value
      .map((item) => sanitizeMetadataValue(item, keyPath))
      .filter((item) => item !== undefined);
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (DROP_METADATA_KEY_RE.test(key) && !ALLOW_HASH_KEY_RE.test(key)) {
      continue;
    }

    const sanitized = sanitizeMetadataValue(child, [...keyPath, key]);
    if (sanitized !== undefined) {
      out[key] = sanitized;
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

export function sanitizeFrankPayload(input: unknown): SanitizedPayload {
  const root = isRecord(input) ? input : {};
  const prompt = isRecord(root.prompt) ? root.prompt : {};

  const systemText =
    toOptionalString(root.systemText) ??
    toOptionalString(prompt.system);
  const userText =
    toOptionalString(root.userText) ??
    toOptionalString(prompt.user);
  const assistantText =
    toOptionalString(root.assistantText) ??
    toOptionalString(root.response);

  const route = toOptionalString(root.route, 200);
  const messagesCount = toOptionalNumber(root.messagesCount);
  const messages = sanitizeMessages(root.messages);
  const toolCalls =
    sanitizeToolCalls(root.toolCalls) ??
    (Array.isArray(root.tool_calls) ? sanitizeToolCalls(root.tool_calls) : undefined);

  const metadataRaw = isRecord(root.metadata) ? root.metadata : undefined;
  const metadata = metadataRaw
    ? (sanitizeMetadataValue(metadataRaw, ['metadata']) as Record<string, unknown> | undefined)
    : undefined;

  const out: SanitizedPayload = {};
  if (userText) out.userText = userText;
  if (systemText) out.systemText = systemText;
  if (assistantText) out.assistantText = assistantText;
  if (messagesCount !== undefined) out.messagesCount = messagesCount;
  if (messages && messages.length > 0) out.messages = messages;
  if (toolCalls) out.toolCalls = toolCalls;
  if (route) out.route = route;
  if (metadata && Object.keys(metadata).length > 0) out.metadata = metadata;

  return out;
}
