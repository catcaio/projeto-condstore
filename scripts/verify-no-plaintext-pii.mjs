import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCHEMA_FILE = path.join(PROJECT_ROOT, 'src', 'drizzle', 'schema.ts');

let hasViolations = false;

function scanSchemaForPlaintextPII() {
    if (!fs.existsSync(SCHEMA_FILE)) {
        console.warn('⚠️  [Gate] Schema Drizzle file not found, skipping schema scan.');
        return;
    }

    const content = fs.readFileSync(SCHEMA_FILE, 'utf-8');
    const lines = content.split('\n');

    const suspiciousSignatures = [
        /cnpj:\s*varchar/,
        /cpf:\s*varchar/,
        /cnpjPlain:\s*varchar/,
        /cpfPlain:\s*varchar/,
        /cnpj:\s*text/,
        /cpf:\s*text/,
    ];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('//')) continue; // Ignore comments

        for (const sig of suspiciousSignatures) {
            if (sig.test(line)) {
                console.error(`🚨 [GATE FAILED] PII em Plaintext detectado no Schema (Linha ${i + 1})`);
                console.error(`  -> ${line}`);
                console.error(`  [!] Você deve usar hash (ex: cnpjHash) ou criptografia (ex: cpfEncrypted) nativamente.`);
                hasViolations = true;
            }
        }
    }
}

function scanPersistenceFlowsForLogMasking() {
    const SRC_DIR = path.join(PROJECT_ROOT, 'src');

    // Recursively walk through files
    function walkSync(currentDirPath, callback) {
        fs.readdirSync(currentDirPath).forEach((name) => {
            const filePath = path.join(currentDirPath, name);
            const stat = fs.statSync(filePath);
            if (stat.isFile() && (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
                callback(filePath);
            } else if (stat.isDirectory()) {
                walkSync(filePath, callback);
            }
        });
    }

    const regexPiiDataPatterns = [
        /console\.log\(.*cnpj.*\)/i,
        /structuredLogger\.(info|warn|error)\(.*cpf.*\)/i,
        /JSON\.stringify\(.*cnpj.*\)/i,
        /JSON\.stringify\(.*cpf.*\)/i,
    ];

    walkSync(SRC_DIR, (filePath) => {
        // Skip tests and infra
        if (filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('scripts')) return;

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
            if (line.trim().startsWith('//')) return;

            for (const rx of regexPiiDataPatterns) {
                if (rx.test(line) && !line.includes('[REDACTED]') && !line.includes('Hash') && !line.includes('Encrypted')) {
                    // Exception check
                    if (line.includes('eslint-disable-next-line')) return;

                    console.error(`🚨 [GATE FAILED] Possível log ou serialização de PII plaintext detectado!`);
                    console.error(`  Arquivo: ${filePath.replace(PROJECT_ROOT, '')}:${idx + 1}`);
                    console.error(`  -> ${line.trim()}`);
                    hasViolations = true;
                }
            }
        });
    });
}

console.log('🛡️ [Gate] Iniciando varredura Anti-PII (Zero-Trust)...');
scanSchemaForPlaintextPII();
scanPersistenceFlowsForLogMasking();

if (hasViolations) {
    console.error('❌ [Gate] Falha na Pipeline! Foram encontradas referências à PII em modo texto. Corriga via Hashing ou Redaction.');
    process.exit(1);
} else {
    console.log('✅ [Gate] Nenhum vazamento lógico de PII (CNPJ/CPF plaintext) encontrado no domínio transacional.');
    process.exit(0);
}
