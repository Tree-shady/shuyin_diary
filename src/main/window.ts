import { BrowserWindow, shell } from 'electron';
import path from 'node:path';

const isDev = process.env.NODE_ENV === 'development';
const DEV_SERVER_URL = 'http://localhost:5173';

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '树影日记',
    backgroundColor: '#f5f6f8',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // 外部链接用系统浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    void win.loadURL(DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return win;
}
