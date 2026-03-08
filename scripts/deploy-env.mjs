import fs from 'fs';
import { execSync } from 'child_process';

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split(/\r?\n/);

const varsToPush = [];
for (const line of lines) {
    if (line.trim().startsWith('MELHOR_ENVIO_') && line.includes('=')) {
        const key = line.substring(0, line.indexOf('=')).trim();
        const value = line.substring(line.indexOf('=') + 1).trim();
        if (key === 'MELHOR_ENVIO_CLIENT_ID' || key === 'MELHOR_ENVIO_CLIENT_SECRET') continue;
        if (varsToPush.find(v => v.key === key)) continue; // ignore duplicates
        varsToPush.push({ key, value });
    }
}

for (const { key, value } of varsToPush) {
    try {
        console.log(`Pushing ${key}...`);
        execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' });
    } catch (e) { }
    try {
        execSync(`npx vercel env add ${key} production`, { input: value, stdio: 'pipe' });
    } catch (e) {
        console.error(`Failed to add ${key}`);
    }
}
console.log('Done pushing vars to Vercel.');
