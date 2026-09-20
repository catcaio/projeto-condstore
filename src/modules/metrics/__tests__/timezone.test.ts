import { describe, expect, it } from 'vitest';
import {
    METRICS_TIMEZONE,
    METRICS_TZ_OFFSET,
    getMetricsDateString,
    getMetricsMonthString,
    getRollingWindowStart,
    getStartOfDayInMetricsTimezone,
} from '../timezone';

describe('metrics timezone contract (issue #396)', () => {
    it('declara America/Sao_Paulo com offset fixo -03:00', () => {
        expect(METRICS_TIMEZONE).toBe('America/Sao_Paulo');
        expect(METRICS_TZ_OFFSET).toBe('-03:00');
    });

    it('vira o dia na meia-noite SP, não na meia-noite UTC', () => {
        // 02:59:59Z = 23:59:59 SP do dia anterior
        const beforeMidnight = new Date('2026-09-20T02:59:59.000Z');
        expect(getStartOfDayInMetricsTimezone(beforeMidnight).toISOString()).toBe('2026-09-19T03:00:00.000Z');
        expect(getMetricsDateString(beforeMidnight)).toBe('2026-09-19');

        // 03:00:00Z = 00:00:00 SP — novo dia
        const atMidnight = new Date('2026-09-20T03:00:00.000Z');
        expect(getStartOfDayInMetricsTimezone(atMidnight).toISOString()).toBe('2026-09-20T03:00:00.000Z');
        expect(getMetricsDateString(atMidnight)).toBe('2026-09-20');
    });

    it('meio-dia UTC cai no mesmo dia SP', () => {
        const noonUtc = new Date('2026-09-20T12:00:00.000Z');
        expect(getMetricsDateString(noonUtc)).toBe('2026-09-20');
        expect(getStartOfDayInMetricsTimezone(noonUtc).toISOString()).toBe('2026-09-20T03:00:00.000Z');
    });

    it('deriva ano-mês SP da mesma fronteira de dia', () => {
        expect(getMetricsMonthString(new Date('2026-09-20T02:59:59.000Z'))).toBe('2026-09');
        expect(getMetricsMonthString(new Date('2026-10-01T02:59:59.000Z'))).toBe('2026-09');
        expect(getMetricsMonthString(new Date('2026-10-01T03:00:00.000Z'))).toBe('2026-10');
    });

    it('janelas móveis são instantes absolutos (now - N dias exatos)', () => {
        const now = new Date('2026-09-20T15:30:00.000Z');
        expect(getRollingWindowStart(now, 1).toISOString()).toBe('2026-09-19T15:30:00.000Z');
        expect(getRollingWindowStart(now, 7).toISOString()).toBe('2026-09-13T15:30:00.000Z');
        expect(getRollingWindowStart(now, 14).toISOString()).toBe('2026-09-06T15:30:00.000Z');
        expect(getRollingWindowStart(now, 30).toISOString()).toBe('2026-08-21T15:30:00.000Z');
    });
});
