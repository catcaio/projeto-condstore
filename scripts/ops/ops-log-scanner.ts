export {}; // Module isolation

/**
 * ops-log-scanner.ts — Structured log scanner for operational metrics
 *
 * Reads log files (worker stdout or Vercel log exports) and extracts
 * counts of key operational events for the monitoring dashboard.
 *
 * Usage:
 *   node --import tsx scripts/ops/ops-log-scanner.ts <logfile>
 *   node --import tsx scripts/ops/ops-log-scanner.ts c:\tmp\worker-finops.log
 *
 * Also supports reading from stdin:
 *   npx vercel logs --output raw --since 2h | node --import tsx scripts/ops/ops-log-scanner.ts -
 */

import fs from 'fs';
import readline from 'readline';

// Metrics we care about
const METRIC_PATTERNS: Record<string, string[]> = {
  'webhook_incoming': ['whatsapp_inbound', 'webhook_received'],
  'webhook_invalid_signature': ['signature_verification_failed', 'invalid_signature'],
  'whatsapp_incoming_error': ['inbound_orchestrator_error', 'orchestrator_error'],
  'queue_jobs_processed': ['queue_worker_job_completed', 'queue_jobs_processed_total'],
  'queue_jobs_failed': ['queue_worker_job_failed', 'queue_jobs_failed_total'],
  'quote_processed': ['quote_worker_completed', 'FREIGHT_QUOTE_COMPLETED'],
  'quote_timeout': ['quote_worker_failed', 'quote_timeout'],
  'stripe_webhook_error': ['webhook_worker_processing_failed', 'stripe_webhook_error'],
  'stripe_webhook_ok': ['webhook_worker_processed_event'],
  'worker_started': ['worker_started', 'Starting'],
  'worker_shutdown': ['worker_shutdown', 'worker_draining'],
  'event_processing_failed': ['event_processing_failed'],
  'circuit_breaker_open': ['circuit_breaker_open', 'circuitBreaker.*open'],
};

interface ScanResult {
  file: string;
  linesScanned: number;
  metrics: Record<string, number>;
  errors: string[];
  latencies: number[];
  firstTimestamp: string | null;
  lastTimestamp: string | null;
}

async function scanLogFile(input: NodeJS.ReadableStream, fileName: string): Promise<ScanResult> {
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  const result: ScanResult = {
    file: fileName,
    linesScanned: 0,
    metrics: {},
    errors: [],
    latencies: [],
    firstTimestamp: null,
    lastTimestamp: null,
  };

  // Initialize all metrics to 0
  for (const key of Object.keys(METRIC_PATTERNS)) {
    result.metrics[key] = 0;
  }

  for await (const line of rl) {
    result.linesScanned++;

    // Try to parse as JSON structured log
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(line);
    } catch {
      // Not JSON, scan as plain text
    }

    const message = parsed?.message as string || line;
    const timestamp = parsed?.timestamp as string || null;

    if (timestamp) {
      if (!result.firstTimestamp) result.firstTimestamp = timestamp;
      result.lastTimestamp = timestamp;
    }

    // Extract latency if present
    const context = parsed?.context as Record<string, unknown> | undefined;
    if (context?.durationMs) {
      result.latencies.push(Number(context.durationMs));
    }
    if (context?.latencyMs) {
      result.latencies.push(Number(context.latencyMs));
    }

    // Count metrics
    for (const [metricName, patterns] of Object.entries(METRIC_PATTERNS)) {
      for (const pattern of patterns) {
        if (message.includes(pattern)) {
          result.metrics[metricName]++;
          break;
        }
      }
    }

    // Collect error lines (first 50)
    const level = parsed?.level as string || '';
    if ((level === 'ERROR' || line.includes('"level":"ERROR"')) && result.errors.length < 50) {
      result.errors.push(message.substring(0, 200));
    }
  }

  return result;
}

function calculatePercentiles(values: number[]): Record<string, number> {
  if (values.length === 0) return { p50: 0, p95: 0, p99: 0, max: 0, avg: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const p = (pct: number) => sorted[Math.min(Math.floor(sorted.length * pct), sorted.length - 1)];
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;

  return {
    p50: p(0.5),
    p95: p(0.95),
    p99: p(0.99),
    max: sorted[sorted.length - 1],
    avg: Math.round(avg),
  };
}

async function main(): Promise<void> {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: node --import tsx scripts/ops/ops-log-scanner.ts <logfile|->');
    console.error('  <logfile>  Path to log file to scan');
    console.error('  -          Read from stdin');
    process.exit(1);
  }

  let input: NodeJS.ReadableStream;
  let fileName: string;

  if (filePath === '-') {
    input = process.stdin;
    fileName = 'stdin';
  } else {
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    input = fs.createReadStream(filePath, 'utf-8');
    fileName = filePath;
  }

  const result = await scanLogFile(input, fileName);
  const latencyStats = calculatePercentiles(result.latencies);

  const report = {
    timestamp: new Date().toISOString(),
    ...result,
    latencyPercentiles: latencyStats,
  };

  console.log(JSON.stringify(report, null, 2));

  // Human-readable summary
  console.log('\n--- Log Scan Summary ---');
  console.log(`File:   ${result.file}`);
  console.log(`Lines:  ${result.linesScanned}`);
  console.log(`Period: ${result.firstTimestamp || 'N/A'} → ${result.lastTimestamp || 'N/A'}`);
  console.log('');
  console.log('Metrics:');

  for (const [name, count] of Object.entries(result.metrics)) {
    if (count > 0) {
      const icon = name.includes('error') || name.includes('failed') || name.includes('timeout')
        ? '⚠️ '
        : '   ';
      console.log(`${icon} ${name}: ${count}`);
    }
  }

  if (result.latencies.length > 0) {
    console.log('');
    console.log('Latency (ms):');
    console.log(`   avg=${latencyStats.avg} p50=${latencyStats.p50} p95=${latencyStats.p95} p99=${latencyStats.p99} max=${latencyStats.max}`);
  }

  if (result.errors.length > 0) {
    console.log('');
    console.log(`Errors (${result.errors.length} total, showing first 5):`);
    for (const err of result.errors.slice(0, 5)) {
      console.log(`  ❌ ${err}`);
    }
  }

  // Exit code 1 if significant errors
  const totalErrors = (result.metrics['webhook_invalid_signature'] || 0) +
    (result.metrics['queue_jobs_failed'] || 0) +
    (result.metrics['whatsapp_incoming_error'] || 0) +
    (result.metrics['stripe_webhook_error'] || 0);

  if (totalErrors > 0) {
    console.log(`\n⚠️  Total operational errors: ${totalErrors}`);
    process.exitCode = 1;
  }
}

void main();
