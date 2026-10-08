/** Native startup decoration; no renderer URL or persistent off preference. */
export interface StartupContext {
  firstRun: boolean; busy: boolean; error: boolean; updating: boolean; schoolMode: boolean; quiet: boolean;
}
export const startupSuppressed = (context: StartupContext): boolean =>
  context.firstRun || context.busy || context.error || context.updating || context.schoolMode || context.quiet;
export const startupDrawWins = (draw: number): boolean => Number.isFinite(draw) && draw >= 0 && draw < .1;
export interface StartupDish {
  id: string; name: {en: string; zhHant: string};
  image?: string; photoStatus: 'available' | 'missing-public-asset' | 'unavailable';
  sourceUrl: string; catalogRevision: string; photoSourceUrl?: string;
}
export interface StartupResult {
  status: 'shown' | 'suppressed' | 'not-selected' | 'unavailable'; dish?: StartupDish;
}
export interface StartupBridge {startupPersonalization(): Promise<StartupResult>}
export const startupPhotoCopy = {
  'missing-public-asset': {en: 'No published public photo was resolved for this dish.', yue: '暫時搵唔到呢款點心已發佈嘅公開相片。'},
  unavailable: {en: 'The public photo is unavailable. No substitute is shown.', yue: '未能載入公開相片，暫時只顯示點心名稱。'},
};
