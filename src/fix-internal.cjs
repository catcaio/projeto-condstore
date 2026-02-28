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
    content = content.replace(/ErrorCode\.INTERNAL_SERVER_ERROR\s*\|\|\s*"INTERNAL_ERROR"\s*as\s*any/g, '"INTERNAL_ERROR" as any');
    fs.writeFileSync(file, content);
}
console.log('Fixed final types');
