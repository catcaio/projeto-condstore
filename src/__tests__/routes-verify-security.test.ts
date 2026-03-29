import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'routes-verify-security.ts');
// Unique temp directory to prevent collisions
const TEST_DIR = path.join(process.cwd(), `.tmp-routes-test-${Date.now()}`);

function createRoute(routePath: string, content: string) {
    const fullPath = path.join(TEST_DIR, 'api', routePath, 'route.ts');
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
}

function runScript(): { stdout: string, stderr: string, status: number | null } {
    try {
        const stdout = execSync(`npx tsx ${SCRIPT_PATH}`, {
            env: { ...process.env, ROUTES_VERIFY_APP_DIR: TEST_DIR },
            stdio: 'pipe',
            encoding: 'utf-8'
        });
        return { stdout, stderr: '', status: 0 };
    } catch (error: any) {
        return { 
            stdout: error.stdout?.toString() || '', 
            stderr: error.stderr?.toString() || '', 
            status: error.status ?? 1
        };
    }
}

describe('Governance: routes-verify-security.ts', () => {

    beforeAll(() => {
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true, force: true, maxRetries: 3 });
        }
        fs.mkdirSync(TEST_DIR, { recursive: true });
    });

    afterAll(() => {
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true, force: true, maxRetries: 3 });
        }
    });

    it('Scenario 1: QUERY EXTRACTION DEVE FALHAR', () => {
        // searchParams.get('tenantId') should trigger INSECURE_INPUT
        createRoute('query-fail', `
            export async function GET(request: Request) {
                const { searchParams } = new URL(request.url);
                const t = searchParams.get('tenantId');
                return Response.json({ t });
            }
        `);

        const result = runScript();
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('[INSECURE_INPUT] /api/query-fail');
        expect(result.stderr).toContain('Extracts tenantId from searchParams. Use secure session instead.');
    }, 15000);

    it('Scenario 2: BODY EXTRACTION DEVE FALHAR', () => {
        // await request.json() extraction should trigger INSECURE_INPUT
        createRoute('body-fail', `
            export async function POST(request: Request) {
                const { tenantId } = await request.json();
                return Response.json({ tenantId });
            }
        `);

        const result = runScript();
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('[INSECURE_INPUT] /api/body-fail');
        expect(result.stderr).toContain('Extracts tenantId from request body. Use secure session instead.');
    }, 15000);

    it('Scenario 3: ROTA PROTEGIDA DEVE PASSAR', () => {
        // A properly guarded route should not trigger warnings
        createRoute('protected-pass', `
            import { requireSession } from '@/infra/auth/guards';
            export async function POST(request: Request) {
                const session = await requireSession(request);
                return Response.json({ ok: true });
            }
        `);

        const result = runScript();
        // Since we have failing routes from previous tests in the directory, 
        // the script will still fail overall, but it shouldn't log warnings for *this* route.
        expect(result.stderr).not.toContain('/api/protected-pass');
    }, 15000);

    it('Scenario 4: PUBLIC PREFIX NÃO DEVE MASCARAR ROTA PROTEGIDA (reports failing without guard)', () => {
        // /api/reports/ without guard should fail because it was removed from PUBLIC_PREFIXES
        createRoute('reports/ingest', `
            export async function POST(request: Request) {
                return Response.json({ ok: true });
            }
        `);

        const result = runScript();
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('[MISSING_GUARD] /api/reports/ingest');
    }, 15000);

    it('Scenario 5: MENSAGEM FINAL COMPATÍVEL', () => {
        const result = runScript();
        // The script's stdout should contain the properly adjusted final message
        expect(result.stderr).toContain('Add the appropriate guard and remove insecure inputs before merging.');
        
        // Let's clear the dir, add one valid route to check success output
        fs.rmSync(TEST_DIR, { recursive: true, force: true, maxRetries: 3 });
        fs.mkdirSync(TEST_DIR, { recursive: true });
        createRoute('protected-only', `
            import { requireSession } from '@/infra/auth/guards';
            export async function POST(request: Request) {
                const session = await requireSession(request);
                return Response.json({ ok: true });
            }
        `);

        const successResult = runScript();
        expect(successResult.status).toBe(0);
        expect(successResult.stdout).toContain('✅ All 1 protected routes have security guardrails.');
        expect(successResult.stdout).toContain('✅ No protected routes extracting tenantId/userId insecurely via request.');
    }, 25000);

    it('Scenario 6: REQUEST ID CONSISTENCY nas rotas ajustadas', () => {
        // Physically inspect the actual project files to ensure they remain patched 
        // to pass requestId to requireSession.
        const eventsPath = path.join(process.cwd(), 'src/app/api/events/route.ts');
        const appEventsPath = path.join(process.cwd(), 'src/app/api/app/events/route.ts');

        const eventsContent = fs.readFileSync(eventsPath, 'utf-8');
        expect(eventsContent).toContain('requireSession(request, { requestId })');

        const appEventsContent = fs.readFileSync(appEventsPath, 'utf-8');
        expect(appEventsContent).toContain('requireSession(request, { requestId })');
    });
});
