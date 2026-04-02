import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { logger } from '@/infra/logger';
import type { TudicoMasterDocument } from './types';

export async function ingestMasterDocument(): Promise<TudicoMasterDocument> {
  const sourcePath = path.join(process.cwd(), 'docs/tudico/master-document.md');
  const startedAt = Date.now();

  const raw = await readFile(sourcePath, 'utf-8');
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
  const titleLine = lines.find((line) => line.startsWith('# ')) ?? '# Documento Mestre';
  const title = titleLine.replace(/^#\s+/, '').trim();

  const summaryStart = lines.findIndex((line) => line.toLowerCase().includes('estado base'));
  const summary = summaryStart >= 0
    ? lines.slice(summaryStart + 1, summaryStart + 3).join(' ').trim()
    : lines.slice(0, 2).join(' ').trim();

  const doc: TudicoMasterDocument = {
    title,
    summary,
    sourcePath: 'docs/tudico/master-document.md',
    lastIngestedAt: new Date().toISOString(),
  };

  logger.info('tudico_master_document_ingested', {
    sourcePath: doc.sourcePath,
    durationMs: Date.now() - startedAt,
    title: doc.title,
  });

  return doc;
}
