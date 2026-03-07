/**
 * Scrape Lojacond catalog product pages and populate packing_profiles as DRAFT.
 *
 * Usage:
 *   npx tsx scripts/scrape-packing-profiles.ts
 *
 * Requires DATABASE_URL to be set (connects directly to DB).
 */

import { randomUUID } from 'crypto';

// ─── Config ─────────────────────────────────────────────────────────────────

const SITEMAP_URL = 'https://lojacondstore.com.br/wp-sitemap-posts-product-1.xml';
const TENANT_ID = process.env.SCRAPE_TENANT_ID || 'lojacond-default';
const CONCURRENCY = 3;
const DELAY_MS = 500; // polite delay between requests

// ─── Types ──────────────────────────────────────────────────────────────────

interface ScrapedProduct {
    url: string;
    slug: string;
    name: string;
    weightKg: number | null;
    dimensionsRaw: string | null;
    baseHeight: number | null;
    baseWidth: number | null;
    baseLength: number | null;
    error?: string;
}

interface ImportStats {
    productsDiscovered: number;
    productsParsed: number;
    profilesCreated: number;
    profilesUpdated: number;
    profilesUntouched: number;
    missingDimensions: number;
    missingWeight: number;
    errors: string[];
}

// ─── Step 1: Discover product URLs from sitemap ─────────────────────────────

async function discoverProductUrls(): Promise<string[]> {
    console.log(`[DISCOVER] Fetching sitemap: ${SITEMAP_URL}`);
    const res = await fetch(SITEMAP_URL);
    const xml = await res.text();

    // Extract <loc> URLs from XML
    const urls: string[] = [];
    const locRegex = /<loc>(https:\/\/lojacondstore\.com\.br\/produto\/[^<]+)<\/loc>/g;
    let match;
    while ((match = locRegex.exec(xml)) !== null) {
        urls.push(match[1]);
    }

    // Deduplicate
    const unique = [...new Set(urls)];
    console.log(`[DISCOVER] Found ${unique.length} unique product URLs`);
    return unique;
}

// ─── Step 2: Extract product data from a single page ────────────────────────

async function scrapeProductPage(url: string): Promise<ScrapedProduct> {
    const slug = url.replace('https://lojacondstore.com.br/produto/', '').replace(/\/$/, '');

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'CondstoreOS-PackingScraper/1.0',
                'Accept': 'text/html',
            },
        });

        if (!res.ok) {
            return { url, slug, name: slug, weightKg: null, dimensionsRaw: null, baseHeight: null, baseWidth: null, baseLength: null, error: `HTTP ${res.status}` };
        }

        const html = await res.text();

        // Extract product name from <h1> or <title>
        const titleMatch = html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([^<]+)<\/h1>/i)
            || html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const name = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : slug;

        // Extract weight from WooCommerce "additional information" table
        // Pattern: <th>Peso</th>\n<td>X kg</td>  or variations
        let weightKg: number | null = null;
        const weightPatterns = [
            /Peso\s*<\/t[hd]>\s*<td[^>]*>\s*([0-9.,]+)\s*(?:kg|g)/i,
            /class="woocommerce-product-attributes-item--weight"[^>]*>[\s\S]*?<td[^>]*>\s*([0-9.,]+)\s*(?:kg|g)/i,
            /"weight"[^:]*:\s*"?([0-9.,]+)/i,
        ];
        for (const pat of weightPatterns) {
            const m = html.match(pat);
            if (m) {
                let w = parseFloat(m[1].replace(',', '.'));
                // If pattern matched "g" unit at end, check the original match
                if (m[0].toLowerCase().endsWith('g') && !m[0].toLowerCase().endsWith('kg')) {
                    w = w / 1000;
                }
                weightKg = w;
                break;
            }
        }

        // Also try extracting from description text
        if (weightKg === null) {
            const descWeight = html.match(/Peso\s*(?::|=|:)?\s*([0-9.,]+)\s*(?:kg)/i);
            if (descWeight) {
                weightKg = parseFloat(descWeight[1].replace(',', '.'));
            }
        }

        // Extract dimensions from WooCommerce "additional information" table
        let dimensionsRaw: string | null = null;
        let baseLength: number | null = null;
        let baseWidth: number | null = null;
        let baseHeight: number | null = null;

        const dimPatterns = [
            /Dimen(?:sões|s[oõ]es)\s*<\/t[hd]>\s*<td[^>]*>\s*([^<]+)/i,
            /class="woocommerce-product-attributes-item--dimensions"[^>]*>[\s\S]*?<td[^>]*>\s*([^<]+)/i,
        ];
        for (const pat of dimPatterns) {
            const m = html.match(pat);
            if (m) {
                dimensionsRaw = m[1].trim();
                break;
            }
        }

        // Parse dimensions: "L × W × H cm" or "L x W x H cm" variations
        if (dimensionsRaw) {
            const parsed = parseDimensions(dimensionsRaw);
            if (parsed) {
                baseLength = parsed.length;
                baseWidth = parsed.width;
                baseHeight = parsed.height;
            }
        }

        // Fallback: try extracting from description text
        if (!dimensionsRaw || (baseLength === null && baseWidth === null && baseHeight === null)) {
            const descDim = html.match(/(?:Medidas|Dimen[sõ])[^:]*:\s*(?:\([^)]*\)\s*)?([0-9.,]+)\s*(?:mm|cm)?\s*[×xX]\s*(?:\([^)]*\)\s*)?([0-9.,]+)\s*(?:mm|cm)?\s*[×xX]\s*(?:\([^)]*\)\s*)?([0-9.,]+)\s*(?:mm|cm)?/i);
            if (descDim) {
                let d1 = parseFloat(descDim[1].replace(',', '.'));
                let d2 = parseFloat(descDim[2].replace(',', '.'));
                let d3 = parseFloat(descDim[3].replace(',', '.'));
                // Convert mm to cm if values look like mm (> 100)
                if (d1 > 100 || d2 > 100 || d3 > 100) {
                    d1 = d1 / 10;
                    d2 = d2 / 10;
                    d3 = d3 / 10;
                }
                baseHeight = d1;
                baseWidth = d2;
                baseLength = d3;
                dimensionsRaw = dimensionsRaw || `${descDim[1]} × ${descDim[2]} × ${descDim[3]}`;
            }
        }

        return { url, slug, name, weightKg, dimensionsRaw, baseHeight, baseWidth, baseLength };
    } catch (err: any) {
        return { url, slug, name: slug, weightKg: null, dimensionsRaw: null, baseHeight: null, baseWidth: null, baseLength: null, error: err.message };
    }
}

function parseDimensions(raw: string): { length: number; width: number; height: number } | null {
    // Normalize separators: decode HTML entities, then × → x, remove units
    const cleaned = raw
        .replace(/&times;/gi, 'x')
        .replace(/&amp;times;/gi, 'x')
        .replace(/×/g, 'x')
        .replace(/X/g, 'x')
        .replace(/cm/gi, '')
        .replace(/mm/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Filter out non-dimension values like "Não aplicável" or color lists
    if (/n[ãa]o\s*aplic/i.test(cleaned) || /[a-z]{4,}/i.test(cleaned)) {
        return null;
    }

    const parts = cleaned.split(/\s*x\s*/).map(s => parseFloat(s.replace(',', '.')));
    if (parts.length >= 3 && parts.every(p => !isNaN(p) && p > 0)) {
        let [l, w, h] = parts;
        // If values seem to be in mm (> 100), convert to cm
        if (l > 100 || w > 100 || h > 100) {
            l = l / 10;
            w = w / 10;
            h = h / 10;
        }
        return { length: l, width: w, height: h };
    }
    return null;
}

function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#8211;/g, '–')
        .replace(/&#8212;/g, '—')
        .replace(/&#8217;/g, "'");
}

// ─── Step 3: Import into DB ────────────────────────────────────────────────

async function importToDatabase(products: ScrapedProduct[]): Promise<ImportStats> {
    // Dynamic import so the script can run standalone
    const { getDb } = await import('../src/infra/db');
    const { packingProfiles } = await import('../src/drizzle/schema');
    const { eq, and } = await import('drizzle-orm');

    const db = await getDb();
    const stats: ImportStats = {
        productsDiscovered: products.length,
        productsParsed: products.filter(p => !p.error).length,
        profilesCreated: 0,
        profilesUpdated: 0,
        profilesUntouched: 0,
        missingDimensions: 0,
        missingWeight: 0,
        errors: [],
    };

    for (const product of products) {
        if (product.error) {
            stats.errors.push(`${product.slug}: ${product.error}`);
            continue;
        }

        const hasDimensions = product.baseHeight !== null && product.baseWidth !== null && product.baseLength !== null;
        const hasWeight = product.weightKg !== null;

        if (!hasDimensions) stats.missingDimensions++;
        if (!hasWeight) stats.missingWeight++;

        try {
            // Check if profile already exists for this product ref
            const existing = await db
                .select()
                .from(packingProfiles)
                .where(and(
                    eq(packingProfiles.tenantId, TENANT_ID),
                    eq(packingProfiles.productRef, product.slug),
                ));

            if (existing.length > 0) {
                const profile = existing[0];

                // Do NOT overwrite manually reviewed/active profiles
                if (profile.reviewStatus === 'REVIEWED' || profile.reviewStatus === 'ACTIVE') {
                    stats.profilesUntouched++;
                    console.log(`  [SKIP] ${product.slug} — already ${profile.reviewStatus}, preserving manual review`);
                    continue;
                }

                // Update DRAFT profiles with fresh scraped data
                await db
                    .update(packingProfiles)
                    .set({
                        profileName: product.name,
                        baseHeight: String(product.baseHeight ?? 0),
                        baseWidth: String(product.baseWidth ?? 0),
                        baseLength: String(product.baseLength ?? 0),
                        baseWeight: String(product.weightKg ?? 0),
                        source: 'SITE_SCRAPE',
                    })
                    .where(eq(packingProfiles.id, profile.id));

                stats.profilesUpdated++;
                console.log(`  [UPDATE] ${product.slug}`);
            } else {
                // Create new profile
                await db
                    .insert(packingProfiles)
                    .values({
                        id: randomUUID(),
                        tenantId: TENANT_ID,
                        productRef: product.slug,
                        profileName: product.name,
                        baseHeight: String(product.baseHeight ?? 0),
                        baseWidth: String(product.baseWidth ?? 0),
                        baseLength: String(product.baseLength ?? 0),
                        baseWeight: String(product.weightKg ?? 0),
                        packingMode: 'SINGLE_FIXED',
                        stackable: true,
                        nestable: false,
                        requiresOwnBox: false,
                        heightIncrementPerExtraUnit: '0',
                        widthIncrementPerExtraUnit: '0',
                        lengthIncrementPerExtraUnit: '0',
                        maxUnitsPerVolume: 1,
                        reviewStatus: 'DRAFT',
                        isActive: false,
                        source: 'SITE_SCRAPE',
                    });

                stats.profilesCreated++;
                console.log(`  [CREATE] ${product.slug}`);
            }
        } catch (err: any) {
            stats.errors.push(`DB error for ${product.slug}: ${err.message}`);
        }
    }

    return stats;
}

// ─── Step 4: Batch processing with concurrency control ──────────────────────

async function processBatch<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number, delayMs: number): Promise<R[]> {
    const results: R[] = [];
    let idx = 0;

    async function worker() {
        while (idx < items.length) {
            const i = idx++;
            results[i] = await fn(items[i]);
            if (delayMs > 0) await sleep(delayMs);
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║ LOJACOND CATALOG → PACKING PROFILES SCRAPER ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    // Step 1: Discover
    const urls = await discoverProductUrls();

    // Step 2: Scrape
    console.log(`\n[SCRAPE] Processing ${urls.length} product pages (concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms)...\n`);
    let scraped = 0;
    const products = await processBatch(urls, async (url) => {
        const result = await scrapeProductPage(url);
        scraped++;
        const status = result.error ? `❌ ${result.error}` :
            (result.baseHeight !== null ? `✅ ${result.baseHeight}×${result.baseWidth}×${result.baseLength} cm, ${result.weightKg ?? '?'} kg` : '⚠️ no dims');
        console.log(`  [${scraped}/${urls.length}] ${result.slug} — ${status}`);
        return result;
    }, CONCURRENCY, DELAY_MS);

    // Step 3: Import
    console.log(`\n[IMPORT] Saving ${products.length} profiles to database (tenant: ${TENANT_ID})...\n`);
    const stats = await importToDatabase(products);

    // Step 4: Report
    console.log('\n' + '═'.repeat(50));
    console.log('CATALOG PACKING IMPORT SUMMARY');
    console.log('═'.repeat(50));
    console.log(`  Products discovered:           ${stats.productsDiscovered}`);
    console.log(`  Products parsed successfully:  ${stats.productsParsed}`);
    console.log(`  Profiles created:              ${stats.profilesCreated}`);
    console.log(`  Profiles updated:              ${stats.profilesUpdated}`);
    console.log(`  Profiles untouched (reviewed): ${stats.profilesUntouched}`);
    console.log(`  Missing dimensions:            ${stats.missingDimensions}`);
    console.log(`  Missing weight:                ${stats.missingWeight}`);
    if (stats.errors.length > 0) {
        console.log(`  Errors:                        ${stats.errors.length}`);
        stats.errors.slice(0, 10).forEach(e => console.log(`    - ${e}`));
        if (stats.errors.length > 10) console.log(`    ... and ${stats.errors.length - 10} more`);
    }
    console.log('═'.repeat(50));

    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
