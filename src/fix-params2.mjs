import fs from 'fs';
import { execSync } from 'child_process';

const files = execSync('git grep -l "params: {" src/app/api/tenants').toString().trim().split('\n').filter(Boolean);

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // Fix the signature param type
    content = content.replace(/\{ params \}:\s*\{\s*params:\s*\{\s*([^}]+)\s*\}\s*\}/g, '{ params }: { params: Promise<{ $1 }> }');
    // Fix destructuring
    content = content.replace(/const\s+\{\s*([^}]+)\s*\}\s*=\s*params;/g, 'const { $1 } = await params;');
    // Fix direct access 
    content = content.replace(/params\.(tenantId|orderId|sourceId|productId|paymentId)/g, '(await params).$1');

    fs.writeFileSync(file, content);
}
console.log(`Updated refs in ${files.length} files`);
