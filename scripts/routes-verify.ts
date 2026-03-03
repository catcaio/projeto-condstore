import fs from 'fs';
import path from 'path';

const INVENTORY_FILE = path.join(process.cwd(), 'docs', '_generated', 'routes-inventory.md');
const REGISTRY_FILE = path.join(process.cwd(), 'docs', 'routes-registry.md');

function extractPathsFromMarkdownTable(filePath: string, colIndex: number): Set<string> {
    if (!fs.existsSync(filePath)) return new Set();

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const paths = new Set<string>();

    // Basic markdown table parser
    let inTable = false;
    for (const line of lines) {
        if (line.trim().startsWith('|')) {
            if (line.includes('---')) continue; // Skip separator row

            const cols = line.split('|').map(c => c.trim().replace(/`/g, ''));
            if (cols.length > colIndex) {
                const rawPath = cols[colIndex];
                if (rawPath && rawPath !== 'Path' && rawPath !== 'Detected Path') {
                    paths.add(rawPath);
                }
            }
        }
    }
    return paths;
}

function verifyRoutes() {
    console.log('🛡️ Verifying active routes against registry...');

    if (!fs.existsSync(INVENTORY_FILE)) {
        console.error('❌ Inventory file not found. Run `npm run routes:inventory` first.');
        process.exit(1);
    }

    if (!fs.existsSync(REGISTRY_FILE)) {
        console.error('❌ Registry file docs/routes-registry.md not found.');
        process.exit(1);
    }

    const inventoryPaths = extractPathsFromMarkdownTable(INVENTORY_FILE, 1);
    const registryPaths = extractPathsFromMarkdownTable(REGISTRY_FILE, 1);

    const unregisteredRoutes: string[] = [];

    inventoryPaths.forEach(p => {
        // If exact match isn't found, check if it's literally just missing.
        // We might want to expand this to support params like [id] gracefully, but exact matching works initially since Next JS folds them.
        if (!registryPaths.has(p)) {
            unregisteredRoutes.push(p);
        }
    });

    if (unregisteredRoutes.length > 0) {
        console.error('\n❌ Unregistered route(s) detected:');
        unregisteredRoutes.forEach(r => console.error(`   - ${r}`));
        console.error('\nAdd them to docs/routes-registry.md');
        process.exit(1);
    }

    console.log(`✅ All ${inventoryPaths.size} routes are documented in the registry.`);
    process.exit(0);
}

verifyRoutes();
