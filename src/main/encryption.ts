import { app, safeStorage } from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 日记内容加密模块
 * - 算法：AES-256-GCM（带认证标签，防篡改）
 * - 密钥：首次启动随机生成 256-bit，经系统 safeStorage(DPAPI/Keychain) 加密后落盘
 * - 密文格式：base64( iv[12] | authTag[16] | ciphertext )
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

let secretKey: Buffer | null = null;

function keyFilePath(): string {
  return path.join(app.getPath('userData'), 'secret.key');
}

/** 初始化（必须在 app ready 之后调用）：读取或生成主密钥 */
export function initEncryption(): void {
  const file = keyFilePath();

  if (fs.existsSync(file)) {
    const wrapped = fs.readFileSync(file);
    const base64Key = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(wrapped)
      : wrapped.toString('utf8');
    secretKey = Buffer.from(base64Key, 'base64');
    return;
  }

  secretKey = crypto.randomBytes(KEY_LENGTH);
  const base64Key = secretKey.toString('base64');
  const payload = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(base64Key)
    : Buffer.from(base64Key, 'utf8');
  fs.writeFileSync(file, payload);
}

function getKey(): Buffer {
  if (!secretKey) {
    throw new Error('加密模块尚未初始化，请先调用 initEncryption()');
  }
  return secretKey;
}

/** 加密明文，返回 Base64 字符串 */
export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

/** 解密 Base64 密文；数据损坏时抛出异常 */
export function decrypt(payload: string): string {
  const data = Buffer.from(payload, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    'utf8',
  );
}
