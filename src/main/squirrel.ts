import { app } from 'electron';
import { spawn } from 'node:child_process';
import path from 'node:path';

export interface SquirrelStartupRuntime {
  argv: readonly string[];
  platform: string;
  executable: string;
  quit: () => void;
  launch: (program: string, args: readonly string[], finished: (error?: Error) => void) => void;
  reportError: (error: Error) => void;
}
const lifecycleFlags = new Set(['--squirrel-install', '--squirrel-updated', '--squirrel-uninstall', '--squirrel-obsolete']);

/** Return true when normal application startup must stop for an installer lifecycle event. */
export function handleSquirrelStartup(runtime?: SquirrelStartupRuntime): boolean {
  const context: SquirrelStartupRuntime = runtime ?? {
    argv: process.argv,
    platform: process.platform,
    executable: process.execPath,
    quit: () => app.quit(),
    reportError: error => console.error('Squirrel shortcut operation failed:', error.message),
    launch: (program, args, finished) => {
      const child = spawn(program, [...args], { detached: false, windowsHide: true, stdio: 'ignore' });
      let settled = false;
      const complete = (error?: Error) => { if (!settled) { settled = true; clearTimeout(timeout); finished(error); } };
      const timeout = setTimeout(() => {
        child.kill();
        complete(new Error('Update.exe shortcut operation exceeded 30 seconds.'));
      }, 30000);
      child.once('error', complete);
      child.once('exit', code => complete(code === 0 ? undefined : new Error(`Update.exe exited with code ${code ?? 'unknown'}.`)));
    },
  };
  if (context.platform !== 'win32') return false;
  const event = context.argv.find(argument => lifecycleFlags.has(argument));
  if (!event) return false;
  if (event === '--squirrel-obsolete') { context.quit(); return true; }
  // Installed payloads live in <install>/app-<version>; Update.exe is in <install>.
  const updater = path.win32.resolve(path.win32.dirname(context.executable), '..', 'Update.exe');
  const executableName = path.win32.basename(context.executable);
  const operation = event === '--squirrel-uninstall' ? '--removeShortcut' : '--createShortcut';
  try {
    context.launch(updater, [operation, executableName], error => {
      if (error) context.reportError(error);
      context.quit();
    });
  } catch (error) {
    context.reportError(error instanceof Error ? error : new Error(String(error)));
    context.quit();
  }
  return true;
}
