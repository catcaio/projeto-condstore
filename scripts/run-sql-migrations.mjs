import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
require('dotenv').config({ path: path.resolve('.env.local') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not found in .env.local');

    console.log('Conectando ao TiDB Cloud...');
    const conn = await mysql.createConnection(url);
    console.log('Conectado!');

    // 1. SHOW TABLES
    const [tableRows] = await conn.query('SHOW TABLES');
    const existingTables = new Set(tableRows.map(r => Object.values(r)[0]));
    console.log('\nTabelas existentes:', [...existingTables].join(', '));

    // 2. Ler todos .sql ordenados
    const drizzleDir = path.resolve(__dirname, '..', 'drizzle');
    const sqlFiles = fs.readdirSync(drizzleDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`\nArquivos SQL encontrados (${sqlFiles.length}):`, sqlFiles.join(', '));

    // 3. Executar cada arquivo statement por statement
    for (const file of sqlFiles) {
        const filePath = path.join(drizzleDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Dividir por --> breakpoint ou por ; (multiplos statements)
        const statements = content
            .split(/(--> statement-breakpoint|\n;|;\n)/g)
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('-->') && !s.startsWith(';'));

        console.log(`\n[${file}] ${statements.length} statement(s)...`);

        for (let idx = 0; idx < statements.length; idx++) {
            const stmt = statements[idx];
            if (!stmt || stmt.trim() === '') continue;
            console.log(`[RUN] ${file} :: stmt ${idx + 1}/${statements.length}`);
            try {
                await conn.query({ sql: stmt, timeout: 60000 });
                // Extrair nome da table se CREATE TABLE
                const match = stmt.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?[`"]?(\w+)[`"]?/i);
                if (match) console.log(`  ✅ CREATE TABLE ${match[1]}`);
                else console.log(`  ✅ OK`);
            } catch (err) {
                if (err.code === 'PROTOCOL_SEQUENCE_TIMEOUT' || err.message.includes('timeout') || err.message.includes('Timeout')) {
                    console.error(`[TIMEOUT] ${file} :: stmt ${idx + 1}`);
                    console.error(stmt.slice(0, 400));
                    process.exit(1);
                } else if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.errno === 1050) {
                    const match = stmt.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?[`"]?(\w+)[`"]?/i);
                    console.log(`  ⚠️  Tabela já existe (skip): ${match ? match[1] : 'desconhecida'}`);
                } else if (err.code === 'ER_DUP_KEYNAME' || err.errno === 1061 || err.message.includes('Duplicate key name')) {
                    console.log(`  ⚠️  Index já existe (skip): ${err.message.split('\n')[0]}`);
                } else if (err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
                    console.log(`  ⚠️  Coluna já existe (skip): ${err.message.split('\n')[0]}`);
                } else if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY' || err.errno === 1091) {
                    console.log(`  ⚠️  Coluna/key não existe para DROP (skip): ${err.message.split('\n')[0]}`);
                } else if (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054) {
                    console.log(`  ⚠️  Coluna já foi removida (skip): ${err.message.split('\n')[0]}`);
                } else if (err.code === 'ER_KEY_COLUMN_DOES_NOT_EXIST' || err.errno === 1072) {
                    console.log(`  ⚠️  Coluna não existe para index (skip): ${err.message.split('\n')[0]}`);
                } else {
                    console.error(`  ❌ ERRO em [${file}]:`);
                    console.error(`     ${err.message}`);
                    console.error(`     SQL: ${stmt.substring(0, 200)}`);
                    await conn.destroy();
                    process.exit(1);
                }
            }
        }
    }

    // 4. SHOW TABLES final
    const [finalRows] = await conn.query('SHOW TABLES');
    const finalTables = finalRows.map(r => Object.values(r)[0]);
    console.log('\n=== TABELAS AO FINAL ===');
    finalTables.forEach(t => console.log(' -', t));

    // 5. Verificar tabelas obrigatórias
    const required = ['stripe_events', 'tenant_subscriptions', 'admin_audit_log', 'llm_events'];
    const missing = required.filter(t => !finalTables.includes(t));
    if (missing.length > 0) {
        console.error('\n❌ TABELAS FALTANDO:', missing.join(', '));
    } else {
        console.log('\n✅ Todas as tabelas obrigatórias existem!');
    }

    await conn.destroy();
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
