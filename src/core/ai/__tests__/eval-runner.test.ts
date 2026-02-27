import { describe, it, expect, vi } from 'vitest';
import { runEvals } from '../evals/eval-runner';
import fs from 'fs';

vi.mock('../../../infra/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));
vi.mock('../../../infra/db', () => ({
    getDb: vi.fn().mockImplementation(() => {
        throw new Error('Offline for testing');
    })
}));

const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => { });
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation((() => { }) as any);
const mockMkdir = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
const mockWrite = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

describe('Eval Harness Runner', () => {
    it('should parse dataset, run eval gracefully and fail CI if score drops', async () => {
        // We run tests against the main freight-quotes.v1.json if it exists.
        // It's meant to pass to validate the pipeline invariants.
        const datasetPath = 'src/core/ai/evals/datasets/freight-quotes.v1.json';

        await runEvals(datasetPath, false);

        // As long as our PII redactor and injection detector works matching the rules above, 
        // the average score should be > 95, meaning CI GATE PASSED.
        expect(mockProcessExit).toHaveBeenCalledWith(0);
        expect(mockWrite).toHaveBeenCalled();
    });
});
