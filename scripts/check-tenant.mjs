import fs from 'fs';
import path from 'path';

const DEFAULT_SCOPE = [
    'src/modules/atendimento',
    'src/modules/crm',
    'src/modules/pedidos',
    'src/services/notifications.service.ts',
    'src/services/search.service.ts'
];

const SCOPE = process.env.TENANT_ISOLATION_SCOPE
    ? process.env.TENANT_ISOLATION_SCOPE
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : DEFAULT_SCOPE;

function getAllFiles(dirPath, arrayOfFiles = []) {
    if (!fs.existsSync(dirPath)) return arrayOfFiles;
    
    const stat = fs.statSync(dirPath);
    if (stat.isFile()) {
        if (dirPath.endsWith('.ts') && !dirPath.includes('.test.ts') && !dirPath.includes('.spec.ts')) {
            arrayOfFiles.push(dirPath);
        }
        return arrayOfFiles;
    }

    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
        if (file === 'node_modules' || file === 'dist') return;
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            if (file.endsWith('.ts') && !file.includes('.test.ts') && !file.includes('.spec.ts')) {
                arrayOfFiles.push(fullPath);
            }
        }
    });
    return arrayOfFiles;
}

const root = path.resolve(process.cwd());
let targetFiles = [];

SCOPE.forEach(s => {
    const p = path.join(root, s);
    targetFiles = getAllFiles(p, targetFiles);
});

const violations = [];

targetFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const cleanContent = content.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''); 
    
    // Pattern to catch db.xxx() up to a semicolon or logical sequence boundary
    const regex = /db\.(?:select\([^)]*\)\.from|update|delete)\s*\(\s*([a-zA-Z0-9_]+)\s*\)([^;]*)/g;
    let match;

    while ((match = regex.exec(cleanContent)) !== null) {
        const tableName = match[1];
        const restOfQuery = match[2];
        const fullQuery = match[0].trim().replace(/\s+/g, ' ');
        const relPath = path.relative(root, file);

        if (restOfQuery.includes('.where(')) {
            const whereStart = restOfQuery.indexOf('.where(');
            let openBracket = 0;
            let whereContent = '';
            let started = false;
            for (let i = whereStart; i < restOfQuery.length; i++) {
                if (restOfQuery[i] === '(') {
                    openBracket++;
                    started = true;
                } else if (restOfQuery[i] === ')') {
                    openBracket--;
                }
                if (started) {
                    whereContent += restOfQuery[i];
                    if (openBracket === 0) break;
                }
            }

            if (!whereContent.includes('tenantId') && !whereContent.includes('tenant_id')) {
                violations.push(`File: ${relPath}\nTable: ${tableName}\nQuery: ${fullQuery}\nWHERE clause missing tenantId: ${whereContent}\n---`);
            }
        } else {
            violations.push(`File: ${relPath}\nTable: ${tableName}\nQuery: ${fullQuery}\nNo .where() found.\n---`);
        }
    }
});

console.log(`Found ${violations.length} violations.`);
console.log(violations.join('\n'));
process.exit(violations.length > 0 ? 1 : 0);
