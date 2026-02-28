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
    content = content.replace(/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\//g, '@/');
    content = content.replace(/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\//g, '@/');
    content = content.replace(/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\//g, '@/');
    content = content.replace(/import \{ structuredLogger as logger \} from '@\/infra\/log\/logger';/g, "import { logger } from '@/infra/logger';");
    fs.writeFileSync(file, content);
}

let worker = fs.readFileSync('src/workers/knowledge-ingest.ts', 'utf8');
worker = worker.replace(/error as Error/g, 'error');
worker = worker.replace(/import \{ structuredLogger as logger \} from '\.\.\/infra\/log\/logger';/g, "import { logger } from '../infra/logger';");
fs.writeFileSync('src/workers/knowledge-ingest.ts', worker);

let storage = fs.readFileSync('src/modules/knowledge/storage.ts', 'utf8');
storage = storage.replace(/ErrorCode\.FORBIDDEN/g, '"FORBIDDEN" as any');
fs.writeFileSync('src/modules/knowledge/storage.ts', storage);

let rbac = fs.readFileSync('src/modules/knowledge/rbac.ts', 'utf8');
rbac = rbac.replace(/import \{ type Role \} from '\.\.\/\.\.\/infra\/auth\/roles';/g, "import { isRole, type Role } from '../../infra/auth/roles';");
fs.writeFileSync('src/modules/knowledge/rbac.ts', rbac);

console.log('Fixed types and paths');
