import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { piiRedactor } from '../pii-redactor';
import { injectionGuard } from '../injection-guard';
import { logger } from '../../../infra/logger';
import { getDb } from '../../../infra/db';
import { aiEvalRuns } from '../../../drizzle/schema';

type TestCase = {
    id: string;
    description: string;
    input: string;
    expected: {
        mustContain: string[];
        mustNotContain: string[];
        maxLength: number;
        expectLocked: boolean;
        expectInjection?: boolean;
    }
};

type RunResult = {
    id: string;
    passed: boolean;
    score: number;
    errors: string[];
    details: {
        sanitizedInput: string;
    }
};

// Fixture para simular LLM sem custo
function generateMockResponse(state: 'locked' | 'unlocked', input: string): string {
    if (state === 'locked') {
        return "BUDGET_LOCKED: Orçamento mensal atingido. UpgradeRequired: true";
    }
    return "Esta é uma cotação simulada para o frete. O valor é R$ 50,00.";
}

export async function runEvals(datasetPath: string, saveToDb = false) {
    const rawData = fs.readFileSync(datasetPath, 'utf8');
    const dataset: TestCase[] = JSON.parse(rawData);

    const report: RunResult[] = [];
    let totalScore = 0;

    for (const test of dataset) {
        let score = 100;
        const errors: string[] = [];

        // 1. PII Redaction
        const sanitized = piiRedactor.sanitizeInput(test.input);

        // 2. Injection Guard
        const injected = injectionGuard.detectInjection(test.input);
        if (test.expected.expectInjection && !injected) {
            score -= 50;
            errors.push('Missed injection detection');
        } else if (!test.expected.expectInjection && injected) {
            score -= 20; // False positive penalty
            errors.push('False positive injection detection');
        }

        // 3. Mock Pipeline Execution
        // In order to test PII mustContain/mustNotContain we echo the sanitized input inside the mocked response
        const response = generateMockResponse(test.expected.expectLocked ? 'locked' : 'unlocked', sanitized);
        const combinedOutput = `${sanitized} || ${response}`;

        // Fail if original input had PII that was not redacted
        for (const notAllowed of test.expected.mustNotContain) {
            if (combinedOutput.includes(notAllowed)) {
                score -= 50;
                errors.push(`PII leak or banned string found: ${notAllowed}`);
            }
        }

        if (response.length > test.expected.maxLength) {
            score -= 10;
            errors.push(`Response exceeded maxLength: ${response.length} > ${test.expected.maxLength}`);
        }

        for (const required of test.expected.mustContain) {
            if (!combinedOutput.includes(required)) {
                score -= 30;
                errors.push(`Missing required string: ${required}`);
            }
        }

        // Clip score
        score = Math.max(0, score);
        totalScore += score;

        report.push({
            id: test.id,
            passed: score === 100,
            score,
            errors,
            details: {
                sanitizedInput: sanitized
            }
        });
    }

    const averageScore = report.length === 0 ? 0 : Math.round(totalScore / report.length);
    const hasFailures = report.some(r => !r.passed) || averageScore < 95;

    const runId = randomUUID();
    const finalReport = {
        runId,
        timestamp: new Date().toISOString(),
        dataset: path.basename(datasetPath),
        averageScore,
        totalCases: dataset.length,
        passedCases: report.filter(r => r.passed).length,
        failedCases: report.filter(r => !r.passed).length,
        results: report
    };

    console.log(`\n=== AI EVAL HARNESS REPORT ===`);
    console.log(`Dataset: ${finalReport.dataset}`);
    console.log(`Score Máximo: 100 | Obtido: ${averageScore}`);
    console.log(`Casos: ${finalReport.passedCases}/${finalReport.totalCases} passados\n`);

    for (const res of report) {
        if (!res.passed) {
            console.log(`❌ [${res.id}] FAILED (Score: ${res.score})`);
            for (const err of res.errors) {
                console.log(`   - ${err}`);
            }
        }
    }

    // Storage
    if (saveToDb) {
        try {
            const db = await getDb();
            await db.insert(aiEvalRuns).values({
                id: runId,
                promptId: 'cockpit:default', // mock associacao
                promptVersion: 'v1.0.0', // mock associacao
                model: 'offline-fixture-v1',
                score: averageScore,
                reportJson: finalReport
            });
            console.log('\n[✔] Evaluation saved to Database');
        } catch (e) {
            console.warn('\n[!] Could not save to Database, writing local artifact instead...', (e as Error).message);
            saveLocalArtifact(finalReport);
        }
    } else {
        saveLocalArtifact(finalReport);
    }

    if (hasFailures) {
        console.error('\n🚨 CI GATE FAILED: Score below 95 or invariants broken.');
        process.exit(1);
    }

    console.log('\n✅ CI GATE PASSED');
    process.exit(0);
}

function saveLocalArtifact(report: any) {
    const dir = path.resolve(process.cwd(), 'artifacts', 'ai-eval');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const file = path.join(dir, 'latest.json');
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    console.log(`[✔] Evaluation saved to local artifact: ${file}`);
}

import { fileURLToPath } from 'url';

// CLI Entry point
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
    const defaultDataset = fileURLToPath(new URL('./datasets/freight-quotes.v1.json', import.meta.url));
    const dataset = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : defaultDataset;
    const tryDb = !process.argv.includes('--offline');
    runEvals(dataset, tryDb).catch(e => {
        logger.error('ai_eval_critical_failure', e);
        console.error(e);
        process.exit(1);
    });
}
