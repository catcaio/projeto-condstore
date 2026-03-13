import { spawn } from 'child_process';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const child = spawn('npx', ['drizzle-kit', 'push'], { shell: true });

child.stdout.on('data', (d) => {
    const text = d.toString();
    process.stdout.write(text);
    // Auto-answer any rename/create prompt with Enter (default: created)
    if (text.includes('table created or renamed from another table?')) {
        setTimeout(() => child.stdin.write('\n'), 300);
    } 
    // Auto-answer the final warning
    else if (text.includes('Do you want to continue?')) {
        setTimeout(() => child.stdin.write('y\n'), 300);
    }
});

child.stderr.on('data', (d) => process.stderr.write(d.toString()));
child.on('close', (c) => process.exit(c));
