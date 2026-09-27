import { useState } from 'react';
import { useDiaryStore } from '../store/diaryStore';

/** 全屏锁屏：设了密码后启动/锁定时覆盖整个界面 */
export function LockScreen() {
  const unlock = useDiaryStore((s) => s.unlock);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!pin || busy) return;
    setBusy(true);
    setError('');
    try {
      const ok = await unlock(pin);
      if (!ok) {
        setError('密码不正确');
        setPin('');
      }
    } catch {
      setError('解锁失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lock-screen">
      <div className="lock-card">
        <div className="lock-emoji">🌙</div>
        <h1>树影日记已锁定</h1>
        <input
          className="lock-input"
          type="password"
          placeholder="输入密码解锁"
          value={pin}
          autoFocus
          onChange={(e) => {
            setPin(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />
        {error && <div className="lock-error">{error}</div>}
        <button
          className="btn btn-primary btn-large lock-btn"
          disabled={!pin || busy}
          onClick={() => void submit()}
        >
          {busy ? '验证中…' : '解锁'}
        </button>
      </div>
    </div>
  );
}
