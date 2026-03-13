import { spawn } from 'child_process';

const child = spawn('npx.cmd', ['drizzle-kit', 'generate'], { 
    shell: true, 
    env: process.env,
});

child.stdout.on('data', (d) => {
    const output = d.toString();
    console.log(output);
    
    // For inquirer list prompts like "❯ + column"
    if (output.includes('❯')) {
        child.stdin.write('\r\n');
    }
});

child.stderr.on('data', (d) => console.error(d.toString()));
child.on('close', (c) => process.exit(c));
