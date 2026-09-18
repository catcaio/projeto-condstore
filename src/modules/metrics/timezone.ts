/**
 * Timezone canônico das métricas operacionais (issue #396).
 *
 * Todas as métricas temporais do MVP são calculadas em America/Sao_Paulo,
 * explicitamente — nunca no timezone implícito do runtime/banco.
 */

/** Timezone oficial de todas as métricas temporais do MVP. */
export const METRICS_TIMEZONE = 'America/Sao_Paulo';

/** Offset fixo de SP (sem DST desde 2019) usado nas queries SQL via CONVERT_TZ. */
export const METRICS_TZ_OFFSET = '-03:00';

/**
 * Início do dia (00:00) no timezone das métricas, retornado como Date
 * (instante UTC correspondente). `now` permite pinar o instante em testes.
 */
export function getStartOfDayInMetricsTimezone(now: Date = new Date()): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: METRICS_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
    // parts = "YYYY-MM-DD" (meia-noite SP expressa como UTC; SP não tem DST).
    return new Date(`${parts}T00:00:00-03:00`);
}
