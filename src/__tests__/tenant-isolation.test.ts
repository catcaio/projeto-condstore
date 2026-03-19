import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SCOPE = [
    'src/modules/atendimento',
    'src/modules/crm',
    'src/modules/pedidos',
    'src/services/notifications.service.ts',
    'src/services/search.service.ts'
];

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
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
        // Ignora pastas inúteis se existirem
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

describe('Tenant Isolation Enforcement', () => {
    it('should explicitly scope db.select, db.update, and db.delete with tenantId in critical domains', () => {
        const root = path.resolve(process.cwd());
        let targetFiles: string[] = [];
        
        SCOPE.forEach(s => {
            const p = path.join(root, s);
            targetFiles = getAllFiles(p, targetFiles);
        });

        const violations: string[] = [];
        
        targetFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf-8');
            const cleanContent = content.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''); // strip comments
            
            // We search for db statements (select, update, delete)
            // matching till the end of the line or semicolon
            const regex = /db\.(?:select\([^)]*\)\s*\.from|update|delete)\s*\(\s*([a-zA-Z0-9_]+)\s*\)([^;]*)/g;
            let match;

            while ((match = regex.exec(cleanContent)) !== null) {
                const tableName = match[1];
                const restOfQuery = match[2];
                const fullQuery = match[0];
                
                // Ignorar tabelas que não são escopadas por tenant ou são infra globally shared
                // Por ex: userConsentsLog, platformUsers, etc.
                // Mas as tabelas nos modulos alvo normais (crm, orders, search) são tenant-scoped.
                // Se a query tiver um "where(" em qualquer lugar da chain:
                if (restOfQuery.includes('.where(')) {
                    // Extract the where clause content naively
                    const whereStart = restOfQuery.indexOf('.where(');
                    // Match brackets to get the full where clause content
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

                    const tenantColumnPatterns = [
                        `${tableName}.tenantId`,
                        `${tableName}.tenant_id`,
                        `"${tableName}".tenantId`,
                        `"${tableName}".tenant_id`,
                        `\`${tableName}\`.tenantId`,
                        `\`${tableName}\`.tenant_id`,
                    ];

                    const hasTenantScopedWhere = tenantColumnPatterns.some(pattern =>
                        whereContent.includes(pattern)
                    );

                    if (!hasTenantScopedWhere) {
                        violations.push(`Violation in ${path.relative(root, file)}:\nMissing tenant-scoped column in where clause.\nTable: ${tableName}\nQuery snippet: ${fullQuery.substring(0, 150)}`);
                    }
                } else {
                    violations.push(`Violation in ${path.relative(root, file)}:\nMissing '.where()' clause completely.\nTable: ${tableName}\nQuery snippet: ${fullQuery.substring(0, 150)}`);
                }
            }
        });

        if (violations.length > 0) {
            console.log(`Found ${violations.length} tenant isolation violations.`);
            console.log(violations.join('\n\n'));
        }
        
        expect(violations.length).toBe(0);
    });
});
