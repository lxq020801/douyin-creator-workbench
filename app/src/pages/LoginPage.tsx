import { ArrowRight, Clapperboard, KeyRound, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAppStore } from '../store/AppStore';

export function LoginPage() {
  const { login } = useAppStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '登录失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <header className="login-brand">
          <span className="login-brand-mark"><Clapperboard size={20} /></span>
          <span><strong>视频对标工具</strong><small>VIDEO BENCHMARK</small></span>
        </header>

        <div className="login-heading">
          <span>WORKSPACE ACCESS</span>
          <h1 id="login-title">登录你的工作空间</h1>
          <p>使用管理员分配的账号进入。</p>
        </div>

        <form className="login-form" onSubmit={submit}>
          <label>
            <span>用户名</span>
            <div><UserRound size={17} /><input autoComplete="username" autoFocus value={username} onChange={(event) => setUsername(event.target.value)} /></div>
          </label>
          <label>
            <span>密码</span>
            <div><KeyRound size={17} /><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          </label>
          {error ? <p className="login-error" role="alert">{error}</p> : null}
          <button type="submit" disabled={busy || !username.trim() || !password}>
            {busy ? '正在登录…' : '进入工作台'} <ArrowRight size={18} />
          </button>
        </form>
      </section>
      <footer className="login-footer"><span>DIRECTOR LINE / EDIT DECISION</span><span>PRIVATE WORKSPACE</span></footer>
    </main>
  );
}
