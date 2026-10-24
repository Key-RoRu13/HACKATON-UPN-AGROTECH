import { spawn } from 'node:child_process';
const processes = [spawn(process.execPath, ['server/index.mjs'], { stdio: 'inherit' }), spawn('npm', ['run', 'dev', '--workspace', 'apps/web'], { stdio: 'inherit' })];
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; for (const p of processes) p.kill('SIGTERM'); process.exitCode = code; }
for (const p of processes) p.on('exit', code => stop(code || 0));
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
