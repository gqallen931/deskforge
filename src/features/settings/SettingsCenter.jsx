import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../../components/Modal.jsx';

export function SettingsCenter({ onClose }) {
  const [settings, setSettings] = useState(null);
  const [update, setUpdate] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [backups, setBackups] = useState(null);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

  const load = useCallback(async () => {
    setError('');
    try {
      const [nextSettings, nextUpdate] = await Promise.all([window.deskforge.settings.get(), window.deskforge.updates.status()]);
      setSettings(nextSettings); setUpdate(nextUpdate);
    } catch (reason) { setError(messageOf(reason)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function run(key, action, success) {
    if (busy) return null;
    setBusy(key); setError(''); setMessage('');
    try {
      const result = await action();
      const nextMessage = typeof success === 'function' ? success(result) : success;
      if (nextMessage) setMessage(nextMessage);
      return result;
    } catch (reason) { setError(messageOf(reason)); return null; }
    finally { setBusy(''); }
  }

  async function loadBackups() {
    const result = await run('backups', () => window.deskforge.data.listBackups());
    if (result) setBackups(result);
  }

  async function importData(kind) {
    const warning = kind === 'import' ? '导入数据将合并或覆盖当前内容，操作前会自动创建安全备份。继续吗？' : '恢复备份将替换当前内容，操作前会自动创建安全备份。继续吗？';
    if (!window.confirm(warning)) return;
    const result = await run(kind, () => kind === 'import' ? window.deskforge.data.importJson() : window.deskforge.data.restore());
    if (!result || result.canceled) return;
    setMessage('数据已恢复；重新打开相关模块即可看到最新内容。');
  }

  if (!settings || !update) return <Modal title="设置中心" onClose={onClose}>{error ? <div className="rx-inline-error" role="alert">{error}<button onClick={load}>重试</button></div> : <div className="rx-loading">正在读取本地设置…</div>}</Modal>;
  const field = (key, value) => setSettings((current) => ({ ...current, [key]: value }));

  return <Modal title="设置中心" onClose={onClose} footer={<><span className={error ? 'rx-status danger' : 'rx-status'}>{error || message}</span><button className="rx-button rx-button--ghost" disabled={Boolean(busy)} onClick={onClose}>取消</button><button className="rx-button rx-button--primary" disabled={Boolean(busy)} onClick={async () => { const saved = await run('save', () => window.deskforge.settings.save(settings), '设置已保存'); if (saved) setSettings(saved); }}>{busy === 'save' ? '正在保存…' : '保存设置'}</button></>}>
    {error && <div className="rx-inline-error" role="alert">{error}<button onClick={() => setError('')}>关闭</button></div>}
    <div className="rx-settings-layout" aria-busy={Boolean(busy)}>
      <div className="rx-settings-main">
        <SettingsPanel number="01" title="身份与工作区" note="只保存在这台电脑"><div className="rx-grid"><label>显示名称<input disabled={Boolean(busy)} value={settings.displayName} maxLength="40" onChange={(event) => field('displayName', event.target.value)} /></label><label>角色<input disabled={Boolean(busy)} value={settings.role} maxLength="40" onChange={(event) => field('role', event.target.value)} /></label><label className="rx-span-2">工作区名称<input disabled={Boolean(busy)} value={settings.workspaceName} maxLength="60" onChange={(event) => field('workspaceName', event.target.value)} /></label></div></SettingsPanel>
        <SettingsPanel number="02" title="界面偏好" note="密度与动态效果"><label className="rx-switch"><input disabled={Boolean(busy)} type="checkbox" checked={settings.compactMode} onChange={(event) => field('compactMode', event.target.checked)} /><i />紧凑任务列表</label><label className="rx-switch"><input disabled={Boolean(busy)} type="checkbox" checked={settings.reduceMotion} onChange={(event) => field('reduceMotion', event.target.checked)} /><i />减少动态效果</label></SettingsPanel>
        <SettingsPanel number="03" title="备份保留" note="自动清理仅作用于应用备份目录"><div className="rx-grid"><label>最多保留<input disabled={Boolean(busy)} type="number" min="1" max="100" value={settings.backupRetentionCount} onChange={(event) => field('backupRetentionCount', Number(event.target.value))} /></label><label>最长天数<input disabled={Boolean(busy)} type="number" min="1" max="3650" value={settings.backupRetentionDays} onChange={(event) => field('backupRetentionDays', Number(event.target.value))} /></label></div><div className="rx-actions"><button disabled={Boolean(busy)} onClick={() => run('backup', () => window.deskforge.data.backup(), '本地备份已创建')}>立即备份</button><button disabled={Boolean(busy)} onClick={loadBackups}>备份历史</button><button disabled={Boolean(busy)} onClick={() => run('prune', () => window.deskforge.data.pruneBackups(), (result) => `清理 ${result.removed} 份，保留 ${result.remaining} 份`)}>清理旧备份</button></div></SettingsPanel>
      </div>
      <aside className="rx-settings-side">
        <section className="rx-panel rx-update-card"><span className="rx-live-dot" />更新通道<h3>{update.message}</h3><p>当前版本 {update.currentVersion}</p><button className="rx-button rx-button--line" disabled={Boolean(busy)} onClick={async () => { if (['disabled', 'development'].includes(update.status)) { setMessage(update.message); return; } const state = await run('update', () => window.deskforge.updates.check()); if (state) { setUpdate(state); setMessage(state.message); } }}>检查更新</button></section>
        <section className="rx-panel"><h3>数据工具</h3><div className="rx-stack"><button disabled={Boolean(busy)} onClick={async () => { const result = await run('export', () => window.deskforge.data.exportJson()); if (result && !result.canceled) setMessage('JSON 已导出'); }}>导出 JSON</button><button disabled={Boolean(busy)} onClick={() => importData('import')}>导入 JSON</button><button disabled={Boolean(busy)} onClick={() => importData('restore')}>从文件恢复</button></div></section>
        <section className="rx-panel"><h3>账户安全</h3><label>当前密码<input disabled={Boolean(busy)} type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /></label><label>新密码<input disabled={Boolean(busy)} type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></label><button className="rx-button rx-button--line" disabled={Boolean(busy) || !passwords.currentPassword || !passwords.newPassword} onClick={async () => { const result = await run('password', () => window.deskforge.auth.changePassword(passwords), '密码已更新'); if (result !== null) setPasswords({ currentPassword: '', newPassword: '' }); }}>修改密码</button></section>
        <section className="rx-legal"><button onClick={() => window.deskforge.legal.open('privacy')}>隐私政策</button><span>·</span><button onClick={() => window.deskforge.legal.open('terms')}>用户协议</button></section>
      </aside>
    </div>
    {backups && <div className="rx-drawer"><div className="rx-drawer-head"><h3>备份历史</h3><button onClick={() => setBackups(null)}>×</button></div>{backups.length ? backups.map((item) => <div className="rx-backup" key={item.id}><div><strong>{item.filename}</strong><small>{Math.max(1, Math.round(item.size / 1024))} KB · {item.kind}</small></div><button disabled={Boolean(busy)} onClick={async () => { if (!window.confirm(`恢复备份“${item.filename}”？\n当前数据会先自动创建安全备份。`)) return; const result = await run('restore-backup', () => window.deskforge.data.restoreBackup(item.id), '备份已恢复'); if (result) await loadBackups(); }}>恢复</button><button disabled={Boolean(busy)} onClick={async () => { if (!window.confirm(`永久删除备份“${item.filename}”？`)) return; const result = await run('remove-backup', () => window.deskforge.data.removeBackup(item.id), '备份已删除'); if (result !== null) await loadBackups(); }}>删除</button></div>) : <p className="rx-muted">还没有备份</p>}</div>}
  </Modal>;
}

function SettingsPanel({ number, title, note, children }) { return <section className="rx-panel"><div className="rx-section-head"><span>{number}</span><div><h3>{title}</h3><p>{note}</p></div></div>{children}</section>; }
function messageOf(reason) { return reason?.message || '操作没有完成，请稍后重试。'; }
