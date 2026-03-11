// Re-export only the Electrobun surface the app uses so we avoid pulling in
// higher-level runtime modules unnecessarily during bundling.
export { BrowserWindow } from '../../node_modules/electrobun/dist/api/bun/core/BrowserWindow.ts';
export { BrowserView } from '../../node_modules/electrobun/dist/api/bun/core/BrowserView.ts';
export { Tray } from '../../node_modules/electrobun/dist/api/bun/core/Tray.ts';
export { Updater } from '../../node_modules/electrobun/dist/api/bun/core/Updater.ts';
export { GlobalShortcut, Screen, ffi } from '../../node_modules/electrobun/dist/api/bun/proc/native.ts';
