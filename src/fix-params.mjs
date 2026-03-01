import fs from 'fs';
import { execSync } from 'child_process';

const files = execSync('git grep -l "params: " src').toString().trim().split('\n').filter(Boolean);

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/params\.(tenantId|orderId|sourceId|productId|paymentId)/g, 'resolvedParams.$1');
    fs.writeFileSync(file, content);
}
console.log(`Updated params refs in ${files.length} files`);
