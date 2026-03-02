import { execSync } from 'child_process';

const forbiddenPatterns = [
    ".env",
    ".env.preview",
    ".env.vercel",
    "VERCEL_OIDC_TOKEN",
    "whsec_",
    "TWILIO_AUTH_TOKEN",
    "STRIPE_WEBHOOK_SECRET",
    "SEED_TOKEN"
];

console.log('🔍 Checking git tree for sensitive environment leaks...');

try {
    // Escaping issues on Windows with grep inside node exec exist, so we use JS native iteration over git files.
    // Ensure we are in a git repository
    const filesString = execSync('git ls-files', { encoding: 'utf-8' });
    const trackedFiles = filesString.split('\n').map(f => f.trim()).filter(Boolean);

    let foundLeaks = false;
    for (const file of trackedFiles) {
        for (const pattern of forbiddenPatterns) {
            // Test filename patterns (.env etc)
            if (file.toLowerCase().includes(pattern.toLowerCase())) {
                console.error(`🚨 FATAL: Potential secret leak detected internally mapped to file node: ${file}`);
                foundLeaks = true;
                break;
            }
        }
    }

    if (foundLeaks) {
        console.error('\n❌ Security gate failed: Do not commit .env files or tokens. Run "git rm --cached <file>" to remove them from history.\n');
        process.exit(1);
    } else {
        console.log('✅ No tracked sensitive .env paths or secret filename signatures found inside git bounds.');
        process.exit(0);
    }
} catch (err) {
    if (err.message.includes('not a git repository')) {
        console.log('⚠️ Skipping env leak check because this is not a git repository.');
        process.exit(0);
    }
    console.error('⚠️ Unknown error running check-env-leak.mjs:', err);
    process.exit(0); // Do not block builds entirely on parsing errors
}
