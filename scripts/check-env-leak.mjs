import { execSync } from 'child_process';
import fs from 'fs';

const forbiddenPatterns = [
    ".env.local",
    ".env.production.local",
    ".env.preview.local",
    ".env.development.local",
    "VERCEL_OIDC_TOKEN",
];

const secretSignatures = [
    /sk_live_[a-zA-Z0-9]{24,}/,
    /whsec_[a-zA-Z0-9]{32,}/,
    /ey[a-zA-Z0-9._-]{20,}\.ey[a-zA-Z0-9._-]{20,}\.[a-zA-Z0-9._-]{20,}/, // JWT
    /xox[baprs]-[a-zA-Z0-9-]{10,}/, // Slack
    /AIza[0-9A-Za-z-_]{35}/, // Google Key
];

console.log('🔍 Checking git tree for sensitive environment leaks...');

try {
    const filesString = execSync('git ls-files', { encoding: 'utf-8' });
    const trackedFiles = filesString.split('\n').map(f => f.trim()).filter(Boolean);

    let foundLeaks = false;
    for (const file of trackedFiles) {
        const lowerFile = file.toLowerCase();

        // 1. Bloqueio absoluto de arquivos .env reais (exceto .env.example e .env.production/preview que são configs públicas)
        const isEnvFile = lowerFile.includes('.env');
        const isSafeEnv = lowerFile === '.env.example' || lowerFile === '.env.production' || lowerFile === '.env.preview';

        if (isEnvFile && !isSafeEnv) {
            console.error(`🚨 FATAL: Sensitive env file detected in git tree: ${file}`);
            foundLeaks = true;
            continue;
        }

        // 2. Scan de conteúdo para arquivos permitidos (como .env.example) para evitar segredos reais
        if (isSafeEnv && fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line || line.startsWith('#')) continue;

                const [key, ...valueParts] = line.split('=');
                const value = valueParts.join('=').replace(/^["']|["']$/g, '').trim();

                if (!value) continue;

                // PLACEHOLDERS PERMITIDOS: se tiver <...>, ..., XXXXX, ou for vazio, ignorar
                const isPlaceholder = /^<.*>$/.test(value) || 
                                     value.includes('...') || 
                                     /^[X]{5,}$/.test(value) ||
                                     value === 'development' ||
                                     value.includes('localhost') ||
                                     value.includes('example.com');

                if (isPlaceholder) continue;

                // Checar assinaturas de segredos
                for (const sig of secretSignatures) {
                    if (sig.test(value)) {
                        console.error(`🚨 FATAL: Real secret signature detected in ${file} at line ${i+1}`);
                        foundLeaks = true;
                    }
                }

                // Checar entropia mínima para valores que não parecem ser placeholders (heurística para chaves)
                if (value.length > 24 && /^[a-zA-Z0-9/+=_-]+$/.test(value) && !isPlaceholder) {
                     // Se tiver muitos caracteres aleatórios e for longo, pode ser uma chave real
                     // Aqui somos conservadores no .env.example
                     console.error(`🚨 FATAL: Potential high-entropy secret in ${file} at line ${i+1}. Use <PLACEHOLDER> instead.`);
                     foundLeaks = true;
                }
            }
        }

        // 3. Checar assinaturas de nomes de arquivos genéricos
        for (const pattern of forbiddenPatterns) {
            if (lowerFile.includes(pattern.toLowerCase())) {
                console.error(`🚨 FATAL: Forbidden file name pattern detected: ${file}`);
                foundLeaks = true;
            }
        }
    }

    if (foundLeaks) {
        console.error('\n❌ Security gate failed: Do not commit .env files or tokens. Run "git rm --cached <file>" to remove them from history.\n');
        process.exit(1);
    } else {
        console.log('✅ No tracked sensitive .env paths or secret signatures found.');
        process.exit(0);
    }
} catch (err) {
    if (err.message.includes('not a git repository')) {
        console.log('⚠️ Skipping env leak check because this is not a git repository.');
        process.exit(0);
    }
    console.error('⚠️ Error running check-env-leak.mjs:', err);
    process.exit(1);
}
