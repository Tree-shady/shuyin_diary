import { useEffect, useState } from 'react';
import { api } from '../api';
import { useDiaryStore } from '../store/diaryStore';

const AUTO_LOCK_OPTIONS = [
  { value: 0, label: '关闭' },
  { value: 1, label: '1 分钟' },
  { value: 5, label: '5 分钟' },
  { value: 15, label: '15 分钟' },
];

interface Message {
  type: 'error' | 'ok';
  text: string;
}

/** 设置弹窗：锁屏密码管理 + 自动锁定 */
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const hasPin = useDiaryStore((s) => s.hasPin);
  const refreshLockState = useDiaryStore((s) => s.refreshLockState);
  const [autoLock, setAutoLock] = useState(0);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    void api
      .getAllSettings()
      .then((settings) => {
        setAutoLock(Number(settings.auto_lock_minutes ?? 0) || 0);
      })
      .catch(() => setAutoLock(0));
  }, []);

  const changeAutoLock = async (minutes: number) => {
    setAutoLock(minutes);
    try {
      await api.setSetting('auto_lock_minutes', String(minutes));
      setMessage({ type: 'ok', text: '自动锁定已更新' });
    } catch {
      setMessage({ type: 'error', text: '保存失败' });
    }
  };

  const handleSetPin = async () => {
    setMessage(null);
    if (newPin.length < 4) {
      setMessage({ type: 'error', text: '密码至少 4 位' });
      return;
    }
    if (newPin !== confirmPin) {
      setMessage({ type: 'error', text: '两次输入的密码不一致' });
      return;
    }
    try {
      await api.setPin(hasPin ? oldPin : null, newPin);
      await refreshLockState();
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setMessage({ type: 'ok', text: hasPin ? '密码已修改' : '密码已设置' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '设置失败',
      });
    }
  };

  const handleRemovePin = async () => {
    setMessage(null);
    try {
      await api.removePin(oldPin);
      await refreshLockState();
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setMessage({ type: 'ok', text: '密码已移除' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '移除失败',
      });
    }
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>设置</span>
          <button className="btn btn-icon" onClick={onClose} title="关闭">
            ×
          </button>
        </div>

        <section className="modal-section">
          <h3>锁屏密码</h3>
          {hasPin ? (
            <>
              <input
                className="modal-input"
                type="password"
                placeholder="原密码"
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
              />
              <input
                className="modal-input"
                type="password"
                placeholder="新密码（至少 4 位）"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
              />
              <input
                className="modal-input"
                type="password"
                placeholder="确认新密码"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
              />
              <div className="modal-actions">
                <button
                  className="btn"
                  onClick={() => void handleRemovePin()}
                  disabled={!oldPin}
                >
                  移除密码
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => void handleSetPin()}
                  disabled={!oldPin || !newPin || !confirmPin}
                >
                  修改密码
                </button>
              </div>
            </>
          ) : (
            <>
              <input
                className="modal-input"
                type="password"
                placeholder="新密码（至少 4 位）"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
              />
              <input
                className="modal-input"
                type="password"
                placeholder="确认新密码"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
              />
              <div className="modal-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => void handleSetPin()}
                  disabled={!newPin || !confirmPin}
                >
                  设置密码
                </button>
              </div>
            </>
          )}
        </section>

        <section className="modal-section">
          <h3>自动锁定</h3>
          <p className="modal-hint">系统无操作达到设定时间后自动锁定（需已设置密码）。</p>
          <select
            className="modal-select"
            value={autoLock}
            onChange={(e) => void changeAutoLock(Number(e.target.value))}
          >
            {AUTO_LOCK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </section>

        {message && (
          <div className={`modal-message ${message.type}`}>{message.text}</div>
        )}
      </div>
    </div>
  );
}
