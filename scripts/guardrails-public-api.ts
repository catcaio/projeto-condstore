import * as fs from 'fs';
import * as path from 'path';

// Defines the guardrail requirements
const RULES = {
    requiresRateLimit: /(rateLimit|limiter)/i,
    requiresSanitization: /(sanitize|clean|sanitization)/i,
    requiresPublicEventsRepo: /(publicEventsRepository\.(insert|create)|analyticsService\.logEvent)/i,
    requiresValidHttpMethod: /export (const|async function) (GET|POST|PUT|PATCH|DELETE)/,
};

function walkDir(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walkDir(filePath, fileList);
        } else {
            if (filePath.endsWith('route.ts') || filePath.endsWith('route.js')) {
                fileList.push(filePath);
            }
        }
    }
    return fileList;
}

function runGuardrails() {
    console.log('🛡️ [Guardrails] Iniciando validação estrutural da API Pública...');
    const publicApiPath = path.join(process.cwd(), 'src/app/api/public');

    if (!fs.existsSync(publicApiPath)) {
        console.warn(`⚠️ [Guardrails] O diretório public da API não existe: ${publicApiPath}`);
        process.exit(0);
    }

    const routeFiles = walkDir(publicApiPath);

    let failed = false;

    for (const file of routeFiles) {
        let fileFailed = false;
        const tempFailures: string[] = [];
        const content = fs.readFileSync(file, 'utf8');

        if (!RULES.requiresRateLimit.test(content)) {
            tempFailures.push(`[Rate Limit] Não foi encontrada estratégia de limite de requisições.`);
            fileFailed = true;
        }

        if (!RULES.requiresSanitization.test(content)) {
            tempFailures.push(`[Sanitization] Não foi encontrada função de sanitização de payload (LGPD).`);
            fileFailed = true;
        }

        if (!RULES.requiresPublicEventsRepo.test(content)) {
            tempFailures.push(`[Event Registry] Não foi encontrada gravação em publicEventsRepository.`);
            fileFailed = true;
        }

        if (!RULES.requiresValidHttpMethod.test(content)) {
            tempFailures.push(`[HTTP Method] Não foi encontrado export de método HTTP válido (GET/POST/etc).`);
            fileFailed = true;
        }

        if (fileFailed) {
            console.error(`❌ [Guardrails] Violação em ${file}:`);
            tempFailures.forEach(f => console.error(`   - ${f}`));
            failed = true;
        } else {
            console.log(`✅ [Guardrails] Arquivo validado: ${path.relative(process.cwd(), file)}`);
        }
    }

    if (failed) {
        console.error('🚫 [Guardrails] Falha detectada em uma ou mais rotas públicas! Build interrompido.');
        process.exit(1);
    }

    console.log('✅ [Guardrails] Public API guardrails passed. Todas as rotas públicas seguem os padrões exigidos.');
}

runGuardrails();
