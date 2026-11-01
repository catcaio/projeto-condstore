import { describe, it, expect } from 'vitest';
import { scanDirectory, isExcluded } from '../../scripts/verify-no-tenant-hardcode.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('verify-no-tenant-hardcode guardrail tests', () => {
    it('detects violations when hardcoded founder tenant is present', () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrail-test-'));
        const badFile = path.join(tmpDir, 'bad-service.ts');
        fs.writeFileSync(badFile, "const tenantId = 'LOJACOND';\nconst query = 'ok';");

        try {
            const violations = scanDirectory(tmpDir);
            expect(violations.length).toBeGreaterThan(0);
            expect(violations[0].content).toContain("'LOJACOND'");
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('passes cleanly when code does not contain hardcoded tenant IDs', () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrail-test-'));
        const goodFile = path.join(tmpDir, 'good-service.ts');
        fs.writeFileSync(goodFile, "const tenantId = context.tenantId;\nreturn getByTenant(tenantId);");

        try {
            const violations = scanDirectory(tmpDir);
            expect(violations.length).toBe(0);
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('correctly respects exclusions for tests and migration files', () => {
        expect(isExcluded('src/app/__tests__/some.test.ts')).toBe(true);
        expect(isExcluded('src/drizzle/migrations/0002_backfill_tenant_id.sql')).toBe(true);
        expect(isExcluded('src/modules/service.ts')).toBe(false);
    });
});
