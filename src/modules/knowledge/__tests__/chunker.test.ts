import { describe, it, expect } from 'vitest';
import { chunkDocument } from '../chunker';

describe('Knowledge Chunker', () => {
    it('should split text into chunks respecting overlaps', () => {
        const text = `Paragraph 1 - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.

Paragraph 2 - Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate.

Paragraph 3 - Velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.`;

        // Force small size to trigger chunking early
        const chunks = chunkDocument({ text, mimeType: 'text/plain' }, { chunkSize: 20, overlap: 5 });

        expect(chunks.length).toBeGreaterThan(1);

        // Check if overlap exists: The end of chunk 0 should be somewhat present at the start of chunk 1
        // Given the naive whitespace implementation, evaluating exact substrings is hard, but we can verify overlap logic indirectly
        const firstChunk = chunks[0].content;
        const secondChunk = chunks[1].content;

        // They should share common words because of overlap
        const words1 = firstChunk.split(' ');
        const words2 = secondChunk.split(' ');

        const lastWordOfFirst = words1[words1.length - 1];
        expect(secondChunk).toContain(lastWordOfFirst); // The word from the overlap should be in the next chunk
    });
});
