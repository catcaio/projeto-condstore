export interface InjectionGuardResult {
    sanitizedQuery: string;
    isSuspicious: boolean;
}

/**
 * Basic RegExp rules to catch prompt injections.
 */
const SUSPICIOUS_PATTERNS = [
    /ignore previous instructions/i,
    /system prompt/i,
    /you are chatgpt/i,
    /you are an ai/i,
    /disregard/i,
    /developer mode/i,
    /dan /i,
    /forget all instructions/i,
    /act as /i,
];

/**
 * Sanitizes and mitigates prompt injection risks before forwarding to LLM.
 */
export function sanitizeQuery(query: string): InjectionGuardResult {
    let isSuspicious = false;
    let sanitizedQuery = query;

    for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(sanitizedQuery)) {
            isSuspicious = true;
            // Neutralize the injection attempt by masking it out.
            sanitizedQuery = sanitizedQuery.replace(pattern, '[REDACTED_INJECTION_ATTEMPT]');
        }
    }

    return {
        sanitizedQuery,
        isSuspicious,
    };
}

export function formatSourcesForPrompt(chunks: Array<{ id: string, docId: string, versionId: string, content: string }>): string {
    return chunks.map(chunk =>
        `<SOURCE chunkId="${chunk.id}" docId="${chunk.docId}" versionId="${chunk.versionId}">\n${chunk.content}\n</SOURCE>`
    ).join('\n\n');
}
