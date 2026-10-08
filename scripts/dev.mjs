import { spawn } from 'node:child_process';
import electron from 'electron';
import './build.mjs';
const child = spawn(electron, ['.'], { stdio: 'inherit', env: process.env });
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
