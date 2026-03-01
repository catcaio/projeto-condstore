import fs from 'fs';
import { execSync } from 'child_process';

const files = execSync('git grep -l "params: { tenantId: string }"').toString().trim().split('\n').filter(Boolean);

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\{ params \}: \{ params: \{ tenantId: string \} \}/g, '{ params }: { params: Promise<{ tenantId: string }> }');
    content = content.replace(/const \{ tenantId \} = params;/g, 'const resolvedParams = await params;\n    const { tenantId } = resolvedParams;');
    fs.writeFileSync(file, content);
}
console.log(`Updated ${files.length} files`);
