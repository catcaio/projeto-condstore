const fs = require('fs');

const files = [
    'src/app/api/knowledge/documents/[id]/mark-sensitive/route.ts',
    'src/app/api/knowledge/documents/[id]/reprocess/route.ts',
    'src/app/api/knowledge/documents/[id]/route.ts',
    'src/app/api/knowledge/documents/route.ts',
    'src/app/api/knowledge/upload/complete/route.ts',
    'src/app/api/knowledge/upload/init/route.ts',
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    // Fix INTERNAL_ERROR -> INTERNAL_SERVER_ERROR
    content = content.replace(/ErrorCode\.INTERNAL_ERROR/g, 'ErrorCode.INTERNAL_SERVER_ERROR || "INTERNAL_ERROR" as any');

    // Fix logger.error('msg', { ..., error }) -> logger.error('msg', error as Error, { ... })
    content = content.replace(/logger\.error\('([^']+)',\s*\{\s*([\s\S]*?)\s*\}\);/g, (match, msg, contextBody) => {
        // If contextBody contains 'error', we pull it out
        if (contextBody.includes('error')) {
            let cleanContext = contextBody.split(',\n').filter(line => !line.trim().startsWith('error')).join(',\n');
            return `logger.error('${msg}', error as Error, { ${cleanContext} });`;
        }
        return match;
    });

    fs.writeFileSync(file, content);
}

let worker = fs.readFileSync('src/workers/knowledge-ingest.ts', 'utf8');
worker = worker.replace(/logger\.error\('Worker loop error', error\);/g, "logger.error('Worker loop error', error as Error);");
worker = worker.replace(/logger\.error\('Failed to create Knowledge ingest group', err\);/g, "logger.error('Failed to create Knowledge ingest group', err as Error);");
fs.writeFileSync('src/workers/knowledge-ingest.ts', worker);

console.log('Fixed more types');
