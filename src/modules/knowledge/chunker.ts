export interface ChunkerOptions {
    chunkSize?: number;
    overlap?: number;
}

export interface DocumentChunk {
    content: string;
    orderIndex: number;
    charStart: number;
    charEnd: number;
    estimatedTokens: number;
}

/**
 * Very basic whitespace-based tokenizer estimation
 */
function estimateTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3);
}

/**
 * Basic markdown chunking engine respecting overlaps.
 */
export function chunkDocument({
    text,
    mimeType,
}: {
    text: string;
    mimeType: string;
}, options?: ChunkerOptions): DocumentChunk[] {
    const chunkSize = options?.chunkSize || 1000;
    const overlap = options?.overlap || 150;

    if (!text.trim()) return [];

    const chunks: DocumentChunk[] = [];

    // Naive split by paragraphs (double newline)
    const paragraphs = text.split(/\n\s*\n/);

    let currentChunkText = '';
    let currentStart = 0;
    let orderIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];

        // If single paragraph is insanely large, we could split it by sentences, but let's stick to simple MVP approach
        const paragraphTokens = estimateTokens(paragraph);
        const currentTokens = estimateTokens(currentChunkText);

        if (currentTokens + paragraphTokens > chunkSize && currentChunkText.length > 0) {
            // Push current chunk
            chunks.push({
                content: currentChunkText.trim(),
                orderIndex: orderIndex++,
                charStart: currentStart,
                charEnd: currentStart + currentChunkText.length,
                estimatedTokens: currentTokens,
            });

            // Calculate overlap text looking backwards into the current chunk
            const words = currentChunkText.split(' ');
            const overlapWords = words.slice(-Math.floor(overlap / 1.3)).join(' ');

            currentStart = currentStart + currentChunkText.length - overlapWords.length;
            currentChunkText = overlapWords + '\n\n' + paragraph;
        } else {
            if (currentChunkText.length === 0) {
                currentStart = text.indexOf(paragraph, currentStart); // Approximate start offset
            }
            currentChunkText += (currentChunkText ? '\n\n' : '') + paragraph;
        }
    }

    if (currentChunkText.trim().length > 0) {
        chunks.push({
            content: currentChunkText.trim(),
            orderIndex: orderIndex++,
            charStart: currentStart,
            charEnd: currentStart + currentChunkText.length,
            estimatedTokens: estimateTokens(currentChunkText),
        });
    }

    return chunks;
}
