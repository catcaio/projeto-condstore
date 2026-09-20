/**
 * Timezone canônico das métricas operacionais (issue #396).
 *
 * Todas as métricas temporais do MVP são calculadas em America/Sao_Paulo,
 * explicitamente — nunca no timezone implícito do runtime/banco.
 *
 * Contrato temporal (obrigatório para queries oficiais em `metrics/queries`
 * e `metrics.repository`):
 * - SQL NUNCA chama NOW()/CURDATE()/UTC_TIMESTAMP()/DATE_SUB(NOW()...).
 *   Toda fronteira de janela é calculada aqui, a partir de um único `now`,
 *   e passada ao SQL como parâmetro (instante UTC ou string de data SP).
 *   Isso elimina dependência do relógio e do timezone da sessão do banco.
 * - Janelas de dia-calendário ("hoje", "este mês") usam meia-noite SP
 *   (`getStartOfDayInMetricsTimezone`, `getMetricsDateString`,
 *   `getMetricsMonthString`).
 * - Janelas móveis (24h/7d/14d/30d) são instantes absolutos
 *   (`getRollingWindowStart`) — independentes de timezone por construção.
 * - Agrupamento por dia-calendário SP no SQL usa
 *   `DATE(CONVERT_TZ(col, '+00:00', METRICS_TZ_OFFSET))` (offsets numéricos
 *   funcionam sem carregar tz tables no MySQL).
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

/**
 * Data-calendário SP ("YYYY-MM-DD") de um instante — para comparações de
 * dia/mês calendário no SQL sem depender do relógio do banco.
 */
export function getMetricsDateString(now: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: METRICS_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
}

/** Ano-mês SP ("YYYY-MM") de um instante — para a métrica mensal. */
export function getMetricsMonthString(now: Date = new Date()): string {
    return getMetricsDateString(now).slice(0, 7);
}

/**
 * Início de janela móvel de N dias terminando em `now` (instante absoluto).
 * Janelas móveis são independentes de timezone por construção.
 */
export function getRollingWindowStart(now: Date, days: number): Date {
    return new Date(now.getTime() - days * 86_400_000);
}
