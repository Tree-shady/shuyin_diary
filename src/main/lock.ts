import { BrowserWindow, powerMonitor } from 'electron';
import crypto from 'node:crypto';
import { IPC } from '../shared/constants';
import * as db from './database';

/**
 * 锁屏密码模块
 * - PIN 经 scrypt + 随机盐哈希后存 settings 表，不存明文
 * - 锁定状态在主进程内存中维护：锁定时日记类 IPC 一律拒绝（见 ipc.ts 守卫）
 * - 支持启动即锁、手动锁定、系统空闲自动锁（powerMonitor）
 */

const KEY_HASH = 'lock_pin_hash';
const KEY_SALT = 'lock_pin_salt';
const KEY_AUTOLOCK = 'auto_lock_minutes';

let locked = false;
let idleTimer: NodeJS.Timeout | null = null;

function hashPin(pin: string, salt: string): string {
  return crypto.scryptSync(pin, salt, 32).toString('hex');
}

function checkPin(pin: string): boolean {
  const settings = db.getAllSettings();
  const salt = settings[KEY_SALT];
  const hash = settings[KEY_HASH];
  if (!salt || !hash) return false;
  return crypto.timingSafeEqual(
    Buffer.from(hashPin(pin, salt), 'hex'),
    Buffer.from(hash, 'hex'),
  );
}

export function hasPin(): boolean {
  const settings = db.getAllSettings();
  return Boolean(settings[KEY_HASH] && settings[KEY_SALT]);
}

export function isLocked(): boolean {
  return locked;
}

export function getState(): { locked: boolean; hasPin: boolean } {
  return { locked, hasPin: hasPin() };
}

/** app ready 之后调用：设了密码则启动即锁，并开启空闲自动锁监视 */
export function initLock(): void {
  locked = hasPin();
  idleTimer = setInterval(() => {
    if (locked || !hasPin()) return;
    const minutes = Number(db.getAllSettings()[KEY_AUTOLOCK] ?? 0);
    if (minutes > 0 && powerMonitor.getSystemIdleTime() >= minutes * 60) {
      lockNow();
    }
  }, 30_000);
}

function notifyLockChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.LOCK_CHANGED, { locked });
  }
}

export function lockNow(): void {
  if (!hasPin() || locked) return;
  locked = true;
  notifyLockChanged();
}

/** 校验密码；成功且处于锁定态时解锁并广播 */
export function verifyPin(pin: string): boolean {
  if (!checkPin(pin)) return false;
  if (locked) {
    locked = false;
    notifyLockChanged();
  }
  return true;
}

/** 设置/修改密码；已设密码时需验证原密码 */
export function setPin(oldPin: string | null, newPin: string): void {
  if (locked) throw new Error('应用已锁定');
  if (hasPin() && (oldPin === null || !checkPin(oldPin))) {
    throw new Error('原密码不正确');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  db.setSetting(KEY_SALT, salt);
  db.setSetting(KEY_HASH, hashPin(newPin, salt));
}

export function removePin(oldPin: string): void {
  if (locked) throw new Error('应用已锁定');
  if (!checkPin(oldPin)) throw new Error('密码不正确');
  db.deleteSetting(KEY_HASH);
  db.deleteSetting(KEY_SALT);
}

/** 停止空闲监视（app 退出前调用，可选） */
export function disposeLock(): void {
  if (idleTimer) {
    clearInterval(idleTimer);
    idleTimer = null;
  }
}
