import { logger } from './logger';
import { redisClient } from './redis.client';
import { appConfig } from '../config/app.config';

/**
 * Normalized Freight Rule structure.
 */
export interface FreightRule {
    cep_inicio: number;
    cep_fim: number;
    peso_max: number;
    valor: number;
    prazo: number;
}

/**
 * Normalized Table Structure: Map<UF, FreightRule[]>
 */
export type FreightTable = Record<string, FreightRule[]>;

// Constants
const REDIS_KEY = 'freight_table:v1';
const MEMORY_TTL_MS = 30 * 60 * 1000; // 30 minutes
const REDIS_TTL_SEC = 6 * 60 * 60; // 6 hours
const FETCH_TIMEOUT_MS = 5000;

// Global memory cache to persist across HMR/invocations
const globalCache = globalThis as unknown as {
    _freightTable?: FreightTable;
    _freightTableUpdatedAt?: number;
};

class FreightTableProvider {
    /**
     * Get freight options for a given route and weight.
     */
    async getFreight(uf: string, cep: string, weight: number): Promise<FreightRule | null> {
        const table = await this.getTable();

        if (!table) {
            logger.warn('Freight table unavailable for calculation');
            return null;
        }

        const rules = table[uf.toUpperCase()];
        if (!rules) {
            logger.debug(`No rules found for UF: ${uf}`);
            return null;
        }

        const cepNum = parseInt(cep.replace(/\D/g, ''), 10);

        // Lookup Logic:
        // 1. Filter by CEP range matches
        // 2. Filter by weight capacity (rule.peso_max >= weight)
        // 3. Sort by price ASC, then by delivery time ASC
        const candidates = rules.filter(r =>
            cepNum >= r.cep_inicio &&
            cepNum <= r.cep_fim &&
            r.peso_max >= weight
        ).sort((a, b) => {
            if (a.valor !== b.valor) return a.valor - b.valor;
            return a.prazo - b.prazo;
        });

        const match = candidates[0] || null;

        logger.debug('Freight table lookup', {
            uf,
            cep_masked: this.maskCep(cep),
            weight,
            found: !!match,
            candidates_count: candidates.length
        });

        return match;
    }

    /**
     * Get freight options by CEP only (iterates all UFs).
     * Useful when UF is not available in the request.
     */
    async getFreightByCep(cep: string, weight: number): Promise<FreightRule | null> {
        const table = await this.getTable();
        if (!table) return null;

        const ufs = Object.keys(table);
        // optimization: if we had a cep-range index, we'd use it. 
        // For now, iterate UFs.

        for (const uf of ufs) {
            const rule = await this.getFreight(uf, cep, weight);
            if (rule) return rule;
        }

        return null;
    }

    /**
     * Retrieve the full freight table with L1/L2 caching strategy.
     */
    private async getTable(): Promise<FreightTable | null> {
        // 1. Check L1 Memory Cache
        if (this.isMemoryCacheValid()) {
            return globalCache._freightTable!;
        }

        // 2. Check L2 Redis Cache
        try {
            const cachedRedis = await redisClient.get<FreightTable>(REDIS_KEY);
            if (cachedRedis) {
                logger.info('Freight table loaded from Redis cache');
                this.updateMemoryCache(cachedRedis);
                return cachedRedis;
            }
        } catch (err) {
            logger.error('Failed to retrieve freight table from Redis', err as Error);
        }

        // 3. Fetch Source
        try {
            const table = await this.fetchAndParse();

            // Update caches
            this.updateMemoryCache(table);

            // Don't await Redis set to avoid blocking, but log errors
            redisClient.set(REDIS_KEY, table, REDIS_TTL_SEC).catch(err => {
                logger.error('Failed to update Redis cache for freight table', err as Error);
            });

            return table;
        } catch (error) {
            logger.error('Failed to fetch/parse freight table', error as Error);

            // 4. Fallback to Stale Memory or Redis if available
            // If we are here, Memory was invalid or empty. Check if it exists at all (stale).
            if (globalCache._freightTable) {
                logger.warn('Serving stale freight table from memory (fallback)');
                return globalCache._freightTable;
            }

            return null;
        }
    }

    private isMemoryCacheValid(): boolean {
        if (!globalCache._freightTable || !globalCache._freightTableUpdatedAt) return false;
        return (Date.now() - globalCache._freightTableUpdatedAt) < MEMORY_TTL_MS;
    }

    private updateMemoryCache(table: FreightTable) {
        globalCache._freightTable = table;
        globalCache._freightTableUpdatedAt = Date.now();

        const stats = {
            ufs: Object.keys(table).length,
            total_rules: Object.values(table).reduce((acc, rs) => acc + rs.length, 0)
        };
        logger.info('Freight table memory cache updated', stats);
    }

    private async fetchAndParse(): Promise<FreightTable> {
        const url = process.env.TABELA_CSV_URL;
        if (!url) {
            throw new Error('TABELA_CSV_URL not defined');
        }

        const start = Date.now();
        logger.info('Fetching freight table CSV...');

        const response = await fetch(url, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        }

        const csvText = await response.text();
        const fetchMs = Date.now() - start;

        const table = this.parseCSV(csvText);

        logger.info('Freight table fetched and parsed', {
            fetch_ms: fetchMs,
            uf_count: Object.keys(table).length,
            rows: Object.values(table).reduce((acc, rs) => acc + rs.length, 0)
        });

        return table;
    }

    private parseCSV(csv: string): FreightTable {
        // Handle BOM
        const cleanCsv = csv.replace(/^\uFEFF/, '');
        const lines = cleanCsv.split(/\r?\n/);

        // Find header line (first non-empty)
        const headerLine = lines.find(l => l.trim().length > 0);
        if (!headerLine) throw new Error('Empty CSV');

        const headers = headerLine.toLowerCase().split(';').map(h => h.trim());

        // Expected headers mapping
        const colMap = {
            uf: headers.indexOf('uf'),
            cep_inicio: headers.indexOf('cep_inicio'),
            cep_fim: headers.indexOf('cep_fim'),
            peso_max: headers.indexOf('peso_max'),
            valor: headers.indexOf('valor'),
            prazo: headers.indexOf('prazo')
        };

        // Validate mandatory headers
        const missing = Object.entries(colMap)
            .filter(([key, idx]) => idx === -1)
            .map(([key]) => key);

        if (missing.length > 0) {
            throw new Error(`Missing mandatory CSV headers: ${missing.join(', ')}`);
        }

        const table: FreightTable = {};
        const headerIndex = lines.indexOf(headerLine);

        for (let i = headerIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = line.split(';');

            // Basic validation
            if (cols.length < headers.length) continue;

            // Extract and Normalize
            try {
                const uf = cols[colMap.uf].trim().toUpperCase();
                // Validate UF length
                if (uf.length !== 2) continue;

                const cep_inicio = this.parseCleanNum(cols[colMap.cep_inicio]);
                const cep_fim = this.parseCleanNum(cols[colMap.cep_fim]);
                const peso_max = this.parseFloatNum(cols[colMap.peso_max]);
                // For 'valor' and 'prazo', we allow floating point but usually plazo is int
                const valor = this.parseFloatNum(cols[colMap.valor]);
                const prazo = this.parseCleanNum(cols[colMap.prazo]);

                if (isNaN(cep_inicio) || isNaN(cep_fim) || isNaN(peso_max) || isNaN(valor) || isNaN(prazo)) {
                    continue; // Skip invalid rows
                }

                if (!table[uf]) table[uf] = [];

                table[uf].push({
                    cep_inicio,
                    cep_fim,
                    peso_max,
                    valor,
                    prazo
                });
            } catch (e) {
                // Ignore parse errors for single lines
                continue;
            }
        }

        if (Object.keys(table).length === 0) {
            throw new Error('No valid freight rules parsed from CSV');
        }

        return table;
    }

    private parseCleanNum(val: string): number {
        // Removes everything except digits
        const num = parseInt(val.replace(/\D/g, ''), 10);
        return isNaN(num) ? NaN : num;
    }

    private parseFloatNum(val: string): number {
        // Handles 'R$ 1.200,50' -> 1200.50
        // 1. Remove non-numeric except , . -
        // 2. If comma exists, replace dots (thousands) then replace comma with dot
        let clean = val.trim();
        if (clean.includes(',')) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        }
        // Remove symbols (R$, kg, etc)
        const num = parseFloat(clean.replace(/[^\d.-]/g, ''));
        return isNaN(num) ? NaN : num;
    }

    private maskCep(cep: string): string {
        if (!cep || cep.length < 5) return '*****';
        return cep.substring(0, 5) + '***';
    }
}

export const freightTableProvider = new FreightTableProvider();

