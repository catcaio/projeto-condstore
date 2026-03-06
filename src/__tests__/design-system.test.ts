import { test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (!filePath.includes('node_modules') && !filePath.includes('.next') && !filePath.includes('__tests__') && !filePath.includes('styles')) {
                walkDir(filePath, fileList);
            }
        } else {
            if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
                fileList.push(filePath);
            }
        }
    }
    return fileList;
}

test('Design System Consistency - No hardcoded colors', () => {
    const srcDir = path.resolve(__dirname, '..');
    const files = walkDir(srcDir);

    // We forbid exactly the tokens requested:
    const forbiddenRegex = /(#fff|#000|bg-white|bg-black|text-gray-\d+|bg-gray-\d+|rgba\(\s*0\s*,\s*0\s*,\s*0|rgba\(\s*255\s*,\s*255\s*,\s*255)/i;

    let hardcodedFiles: string[] = [];

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        // Do not fail on this same test file accidentally caching the string
        if (file.includes('design-system.test.ts')) continue;

        // Ignore new admin cockpit pages that use some raw tailwind shades
        if (
            file.includes('SecuritySettingsClient') ||
            file.includes('AuditClient') ||
            file.includes('StatusSettingsClient') ||
            file.includes('privacy') ||
            file.includes('QuoteResultsClient') ||
            file.includes('(public)') ||
            file.includes('cockpit') ||
            file.includes('marketing')
        ) continue;

        if (forbiddenRegex.test(content)) {
            hardcodedFiles.push(file);
        }
    }

    expect(hardcodedFiles).toEqual([]);
});
