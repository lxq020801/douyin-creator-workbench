import { ArrowRight, Clapperboard, KeyRound, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAppStore } from '../store/AppStore';

export function LoginPage() {
  const { login } = useAppStore();
  const [username, setUsername] = useState('admin');
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
      <header className="login-topbar">
        <div className="login-topbar-inner">
          <div className="login-brand">
            <span className="login-brand-mark"><Clapperboard size={19} /></span>
            <span className="login-brand-copy"><strong>视频对标工具</strong><small>VIDEO BENCHMARK</small></span>
          </div>
          <span className="login-access-label">SECURE WORKSPACE / 01</span>
        </div>
      </header>

      <div className="login-shell">
        <section className="login-intro" aria-labelledby="login-title">
          <div className="login-eyebrow"><i /><span>WORKSPACE ACCESS</span></div>
          <div className="login-heading">
            <h1 id="login-title">回到你的<br /><em>创作空间</em></h1>
            <p>欢迎回来，继续今天的内容工作。</p>
          </div>

          <div className="login-storyboard" aria-hidden="true">
            <div className="login-storyboard-index"><span>01</span><i /><span>03</span></div>
            <div className="login-storyboard-frame is-first"><b>FRAME</b><span /><span /></div>
            <div className="login-storyboard-frame is-second"><i /><strong>VIDEO<br />BENCHMARK</strong></div>
            <div className="login-storyboard-frame is-third"><span /><b>EDIT</b><i /></div>
          </div>
        </section>

        <section className="login-panel" aria-label="登录工作空间">
          <header className="login-panel-heading">
            <div><span>MEMBER SIGN IN</span><small>01 / PRIVATE</small></div>
            <h2>工作空间登录</h2>
          </header>
          <form className="login-form" onSubmit={submit}>
            <label className="login-field">
              <span>账号</span>
              <div><UserRound size={17} /><input aria-label="用户名" placeholder="请输入账号" autoComplete="username" autoFocus value={username} onChange={(event) => setUsername(event.target.value)} /></div>
            </label>
            <label className="login-field">
              <span>密码</span>
              <div><KeyRound size={17} /><input aria-label="密码" placeholder="请输入密码" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>
            </label>
            <button type="submit" disabled={busy || !username.trim() || !password}>
              <span>{busy ? '正在登录…' : '登录工作空间'}</span><ArrowRight size={18} />
            </button>
            {error ? <p className="login-error" role="alert">{error}</p> : null}
          </form>
        </section>
      </div>
    </main>
  );
}
