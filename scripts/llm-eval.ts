
import fs from 'fs';
import readline from 'readline';
import { intentClassifier } from '../src/modules/llm/intent-classifier';

interface GoldenRecord {
    text: string;
    intent: string;
}

async function main() {
    const goldenPath = process.argv[2] || 'golden.jsonl';

    console.log(`Loading golden dataset from: ${goldenPath}`);

    const records: GoldenRecord[] = [];

    // Support both JSONL and JSON Array
    const fileContent = fs.readFileSync(goldenPath, 'utf-8');

    if (fileContent.trim().startsWith('[')) {
        // JSON Array
        const parsed = JSON.parse(fileContent);
        records.push(...parsed);
    } else {
        // JSONL
        const fileStream = fs.createReadStream(goldenPath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        for await (const line of rl) {
            if (line.trim()) {
                try {
                    records.push(JSON.parse(line));
                } catch (e) {
                    console.warn('Skipping invalid JSONL line:', line);
                }
            }
        }
    }

    console.log(`Loaded ${records.length} records. Running evaluation...`);
    console.log('---------------------------------------------------');

    let correct = 0;
    const byIntent: Record<string, { total: number; correct: number }> = {};

    for (const record of records) {
        const prediction = await intentClassifier.classify(record.text);

        // update stats
        if (!byIntent[record.intent]) byIntent[record.intent] = { total: 0, correct: 0 };
        byIntent[record.intent].total++;

        if (prediction.intent === record.intent) {
            correct++;
            byIntent[record.intent].correct++;
        } else {
            console.log(`[MISMATCH] "${record.text}" | Expected: ${record.intent} | Got: ${prediction.intent} (${(prediction.confidence * 100).toFixed(0)}%) [${prediction.fallbackReason || prediction.method}]`);
        }
    }

    console.log('---------------------------------------------------');
    const accuracy = correct / records.length;
    console.log(`OVERALL ACCURACY: ${(accuracy * 100).toFixed(2)}% (${correct}/${records.length})`);

    console.log('\nBY INTENT:');
    Object.entries(byIntent).forEach(([intent, stats]) => {
        const acc = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
        console.log(`  ${intent.padEnd(20)}: ${acc.toFixed(1)}% (${stats.correct}/${stats.total})`);
    });

    if (accuracy < 0.5) {
        console.error("\n[FAIL] Accuracy below 50%");
        process.exit(1);
    }
}

main().catch(console.error);
