import { spawn } from 'child_process';
const child = spawn('npx.cmd', ['drizzle-kit', 'generate'], { stdio: ['pipe', 'inherit', 'inherit'], shell: true });
let times = 0;
const interval = setInterval(() => {
    times++;
    child.stdin.write('\r\n');
    if (times > 50) clearInterval(interval);
}, 500);
child.on('close', () => process.exit(0));
