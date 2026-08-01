import { KeyRound, LoaderCircle, Plus, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { AuthUser, CreateUserInput } from '../types';
import { useAppStore } from '../store/AppStore';
import { Modal } from './Modal';
import { StatusBadge } from './Common';

const emptyUser: CreateUserInput = { username: '', displayName: '', password: '', role: 'user' };

export function UserManagementPanel() {
  const { currentUser, notify } = useAppStore();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<CreateUserInput>(emptyUser);
  const [resetUser, setResetUser] = useState<AuthUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setUsers(await api.users.list());
    } catch (loadError) {
      notify(loadError instanceof Error ? loadError.message : '用户列表读取失败', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const created = await api.users.create(draft);
      setUsers((items) => [...items, created]);
      setCreateOpen(false);
      setDraft(emptyUser);
      notify('用户已创建');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : '用户创建失败');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!resetUser) return;
    setBusy(true);
    setError('');
    try {
      await api.users.resetPassword(resetUser.id, newPassword);
      setResetUser(null);
      setNewPassword('');
      notify('密码已更新，用户需要重新登录');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : '密码修改失败');
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async (user: AuthUser) => {
    if (!window.confirm(`删除“${user.displayName}”及其工作空间内的全部资料、任务和产物？此操作无法撤销。`)) return;
    setBusy(true);
    try {
      await api.users.remove(user.id);
      setUsers((items) => items.filter((item) => item.id !== user.id));
      notify('用户及其工作空间已删除');
    } catch (removeError) {
      notify(removeError instanceof Error ? removeError.message : '用户删除失败', 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-section user-management">
      <div className="settings-section-heading">
        <div><span>ACCESS CONTROL</span><h2>用户与工作空间</h2></div>
        <button className="button button--primary button--sm" type="button" onClick={() => { setError(''); setCreateOpen(true); }}><Plus size={15} /> 新建用户</button>
      </div>
      <p className="user-management-intro">每个用户拥有独立的资料卡、拆解记录、选题和脚本。运行设置由管理员统一维护。</p>

      <div className="user-table" role="table" aria-label="用户列表">
        <div className="user-table-head" role="row"><span>用户</span><span>权限</span><span>创建时间</span><span>操作</span></div>
        {loading ? <div className="user-table-empty"><LoaderCircle className="spin" size={18} /> 正在读取用户…</div> : null}
        {!loading && users.map((user) => (
          <div className="user-table-row" role="row" key={user.id}>
            <div className="user-identity"><span>{user.displayName.slice(0, 1)}</span><div><strong>{user.displayName}</strong><small>@{user.username}{user.id === currentUser?.id ? ' · 当前账号' : ''}</small></div></div>
            <div><StatusBadge tone={user.role === 'admin' ? 'green' : 'neutral'}>{user.role === 'admin' ? <ShieldCheck size={13} /> : <UserRound size={13} />}{user.role === 'admin' ? '管理员' : '普通用户'}</StatusBadge></div>
            <time>{new Date(user.createdAt).toLocaleDateString('zh-CN')}</time>
            <div className="user-actions">
              <button type="button" title="重设密码" disabled={busy || user.id === currentUser?.id} onClick={() => { setError(''); setNewPassword(''); setResetUser(user); }}><KeyRound size={16} /></button>
              <button type="button" title="删除用户" className="is-danger" disabled={busy || user.id === currentUser?.id} onClick={() => void removeUser(user)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={createOpen} title="新建用户" description="创建后会同时建立一套完全独立的工作空间。" onClose={() => { if (!busy) setCreateOpen(false); }}>
        <form className="user-form" onSubmit={createUser}>
          <label><span>显示名称</span><input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} placeholder="例如：柳州门店组" /></label>
          <label><span>登录用户名</span><input autoComplete="off" value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} placeholder="字母、数字、点、横线或下划线" /></label>
          <label><span>初始密码</span><input type="password" minLength={8} autoComplete="new-password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} placeholder="至少 8 个字符" /></label>
          <label><span>权限</span><select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as 'admin' | 'user' })}><option value="user">普通用户</option><option value="admin">管理员</option></select></label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="modal-footer modal-footer--flush"><button className="button button--ghost" type="button" disabled={busy} onClick={() => setCreateOpen(false)}>取消</button><button className="button button--primary" type="submit" disabled={busy || draft.displayName.trim().length < 1 || draft.username.trim().length < 3 || draft.password.length < 8}>{busy ? '正在创建…' : '创建用户'}</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(resetUser)} title={`重设${resetUser ? `“${resetUser.displayName}”` : ''}的密码`} description="保存后该用户已有的登录会话会立即失效。" onClose={() => { if (!busy) setResetUser(null); }}>
        <form className="user-form" onSubmit={resetPassword}>
          <label><span>新密码</span><input type="password" minLength={8} autoComplete="new-password" autoFocus value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="至少 8 个字符" /></label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="modal-footer modal-footer--flush"><button className="button button--ghost" type="button" disabled={busy} onClick={() => setResetUser(null)}>取消</button><button className="button button--primary" type="submit" disabled={busy || newPassword.length < 8}>{busy ? '正在保存…' : '更新密码'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
