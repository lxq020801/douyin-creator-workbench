import { KeyRound, LogOut, Settings, UserRound } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/AppStore';
import { Modal } from './Modal';

export function AccountMenu() {
  const { currentUser, logout, changePassword, notify } = useAppStore();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!currentUser) return null;

  const closeMenu = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await changePassword(currentPassword, newPassword);
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : '密码修改失败');
      setBusy(false);
    }
  };

  return (
    <>
      <details className="account-menu" ref={detailsRef}>
        <summary aria-label="账号菜单">
          <span>{currentUser.displayName.slice(0, 1)}</span>
          <div><strong>{currentUser.displayName}</strong><small>{currentUser.role === 'admin' ? '管理员' : '个人工作空间'}</small></div>
        </summary>
        <div className="account-menu-popover">
          <header><UserRound size={17} /><span><strong>{currentUser.displayName}</strong><small>@{currentUser.username}</small></span></header>
          {currentUser.role === 'admin' ? <Link to="/admin/settings" onClick={closeMenu}><Settings size={16} /> 管理设置</Link> : null}
          <button type="button" onClick={() => { closeMenu(); setPasswordOpen(true); }}><KeyRound size={16} /> 修改密码</button>
          <button type="button" className="is-danger" onClick={() => { closeMenu(); void logout().catch(() => notify('退出登录失败', 'danger')); }}><LogOut size={16} /> 退出登录</button>
        </div>
      </details>

      <Modal open={passwordOpen} title="修改登录密码" description="修改后其他登录会话会立即失效，需要重新登录。" onClose={() => { if (!busy) setPasswordOpen(false); }}>
        <form className="password-form" onSubmit={submitPassword}>
          <label><span>当前密码</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
          <label><span>新密码</span><input type="password" minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
          <label><span>确认新密码</span><input type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="modal-footer modal-footer--flush">
            <button className="button button--ghost" type="button" disabled={busy} onClick={() => setPasswordOpen(false)}>取消</button>
            <button className="button button--primary" type="submit" disabled={busy || !currentPassword || newPassword.length < 8 || !confirmPassword}>{busy ? '正在修改…' : '修改并重新登录'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
