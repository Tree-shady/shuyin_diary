import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { initEncryption } from './encryption';
import { initDatabase } from './database';
import { initLock } from './lock';
import { registerIpcHandlers } from './ipc';
import { createMainWindow } from './window';

function bootstrap(): void {
  initEncryption();
  initDatabase(path.join(app.getPath('userData'), 'diary.db'));
  initLock();
  registerIpcHandlers();
  createMainWindow();
}

app.whenReady().then(() => {
  bootstrap();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
