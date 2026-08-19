import { useEffect, useState } from 'react';

function App() {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ username: '', displayName: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { window.deskforge.auth.status().then(setStatus).catch((err) => setError(err.message)); }, []);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const user = status.needsSetup ? await window.deskforge.auth.register(form) : await window.deskforge.auth.login(form);
      setStatus({ needsSetup: false, authenticated: true, user });
    } catch (err) { setError(String(err.message || err).replace(/^Error invoking remote method '[^']+': Error: /, '')); }
    finally { setBusy(false); }
  }

  if (!status) return <main className="auth-shell"><div className="auth-card"><div className="auth-logo">DF</div><p>正在打开 Deskforge…</p>{error && <div className="auth-error">{error}</div>}</div></main>;
  if (status.authenticated) return <iframe className="dashboard-frame" src="./dashboard.html" title="Deskforge personal workspace" />;

  return <main className="auth-shell">
    <form className="auth-card" onSubmit={submit}>
      <div className="auth-logo">DF</div>
      <h1>{status.needsSetup ? '初始化 Deskforge' : '欢迎回来'}</h1>
      <p>{status.needsSetup ? '创建这台电脑的本地管理员账户' : '登录你的本地个人工作台'}</p>
      {status.needsSetup && <label>显示名称<input value={form.displayName} maxLength="40" autoComplete="name" onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label>}
      <label>用户名<input value={form.username} minLength="3" maxLength="40" autoComplete="username" required autoFocus onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
      <label>密码<input type="password" value={form.password} minLength="8" maxLength="128" autoComplete={status.needsSetup ? 'new-password' : 'current-password'} required onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
      {status.needsSetup && <small>至少 8 位，同时包含字母和数字。密码只以加盐哈希保存在本机。</small>}
      {error && <div className="auth-error">{error}</div>}
      <button type="submit" disabled={busy}>{busy ? '处理中…' : status.needsSetup ? '创建账户并进入' : '登录'}</button>
    </form>
  </main>;
}

export default App;
