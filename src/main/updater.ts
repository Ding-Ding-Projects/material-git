import { app, autoUpdater } from 'electron';
import { EventEmitter } from 'node:events';

export type UpdatePhase = 'unsupported' | 'idle' | 'checking' | 'downloading' | 'ready' | 'failed';
export interface UpdateState {
  phase: UpdatePhase;
  currentVersion: string;
  version?: string;
  releaseNotesUrl: string;
  unsigned: true;
  message?: string;
}
const releaseNotesUrl = 'https://github.com/Ding-Ding-Projects/material-git/releases/latest';
const feedUrl = `${releaseNotesUrl}/download`;
export const updateEvents = new EventEmitter();
let state: UpdateState = { phase: 'idle', currentVersion: app.getVersion(), releaseNotesUrl, unsigned: true };
let started = false;
let interval: ReturnType<typeof setInterval> | undefined;
function publish(next: Partial<UpdateState>) {
  state = { ...state, ...next };
  updateEvents.emit('state', getUpdateState());
}
export function getUpdateState(): UpdateState { return { ...state }; }
export function checkForUpdates(): UpdateState {
  if (!started) startUpdater();
  if (state.phase === 'unsupported' || state.phase === 'checking' || state.phase === 'downloading' || state.phase === 'ready') return getUpdateState();
  try { publish({ phase: 'checking', message: undefined }); autoUpdater.checkForUpdates(); }
  catch (error) { publish({ phase: 'failed', message: error instanceof Error ? error.message : String(error) }); }
  return getUpdateState();
}
export function startUpdater(): UpdateState {
  if (started) return getUpdateState();
  started = true;
  if (process.platform !== 'win32') {
    publish({ phase: 'unsupported', message: 'Automatic updates are available for the installed Windows application. Development builds on this platform can be rebuilt locally.' });
    return getUpdateState();
  }
  if (!app.isPackaged) {
    publish({ phase: 'unsupported', message: 'Automatic updates are available after installation through Setup.exe.' });
    return getUpdateState();
  }
  autoUpdater.on('checking-for-update', () => publish({ phase: 'checking', message: undefined }));
  autoUpdater.on('update-available', () => publish({ phase: 'downloading', message: 'Downloading unsigned update in the background.' }));
  autoUpdater.on('update-not-available', () => publish({ phase: 'idle', message: 'The installed version is current.' }));
  autoUpdater.on('error', error => publish({ phase: 'failed', message: error.message }));
  autoUpdater.on('update-downloaded', (_event, _notes, releaseName) => {
    const version = releaseName?.match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/)?.[0];
    if (!version) { publish({ phase: 'failed', message: 'The downloaded update did not report a valid version; restart installation is unavailable.' }); return; }
    publish({ phase: 'ready', version, message: 'Unsigned update downloaded. Restart to install when your work is saved.' });
  });
  try { autoUpdater.setFeedURL({ url: feedUrl }); }
  catch (error) { publish({ phase: 'failed', message: error instanceof Error ? error.message : String(error) }); return getUpdateState(); }
  interval = setInterval(checkForUpdates, 4 * 60 * 60 * 1000);
  interval.unref();
  app.once('will-quit', () => { if (interval) clearInterval(interval); });
  checkForUpdates();
  return getUpdateState();
}
/** Invoke only after an explicit user action and the caller's unsaved-work check. */
export function restartToInstallUpdate(): boolean {
  if (state.phase !== 'ready') return false;
  autoUpdater.quitAndInstall();
  return true;
}
