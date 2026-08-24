import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal.jsx';

export function NotificationsCenter({ onClose, initialTab = 'notifications' }) {
  const [tab, setTab] = useState(initialTab); const [notifications, setNotifications] = useState(null); const [reminders, setReminders] = useState(null);
  const [form, setForm] = useState({ title: '', remindAt: '', repeatRule: 'none' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const reload = async () => { setError(''); try { const [n, r] = await Promise.all([window.deskforge.notifications.list(), window.deskforge.reminders.list()]); setNotifications(n); setReminders(r); } catch (reason) { setError(messageOf(reason)); setNotifications((current) => current || []); setReminders((current) => current || []); } };
  useEffect(() => { reload(); }, []);
  async function perform(action) { setBusy(true); setError(''); try { await action(); await reload(); } catch (reason) { setError(messageOf(reason)); } finally { setBusy(false); } }
  async function create(event) { event.preventDefault(); await perform(async () => { await window.deskforge.reminders.create(form); setForm({ title: '', remindAt: '', repeatRule: 'none' }); }); }
  function remove(item) { if (window.confirm(`删除提醒“${item.title}”？`)) perform(() => window.deskforge.reminders.remove(item.id)); }
  return <Modal title="通知与提醒" onClose={onClose} footer={<button className="rx-button rx-button--ghost" onClick={onClose}>关闭</button>}>
    <div className="rx-tabs"><button className={tab === 'notifications' ? 'active' : ''} onClick={() => setTab('notifications')}>通知 <b>{notifications?.filter((n) => !n.isRead).length || 0}</b></button><button className={tab === 'reminders' ? 'active' : ''} onClick={() => setTab('reminders')}>提醒 <b>{reminders?.length || 0}</b></button></div>
    {error && <div className="rx-inline-error" role="alert">{error}<button onClick={reload}>重试</button></div>}
    {tab === 'notifications' ? <section className="rx-list" aria-busy={notifications === null || busy}><div className="rx-list-toolbar"><p>任务状态和截止日期产生的本地通知</p><button disabled={busy || !notifications?.some((item) => !item.isRead)} onClick={() => perform(() => window.deskforge.notifications.readAll())}>全部已读</button></div>{notifications === null ? <div className="rx-empty">正在读取通知…</div> : notifications.length ? notifications.map((item) => <article className="rx-list-row" key={item.id}><span className={`rx-signal ${item.type === 'warning' ? 'warning' : ''}`} /><div><strong>{item.title}</strong><p>{item.message}</p></div><time>{formatDate(item.createdAt)}</time>{!item.isRead && <i />}</article>) : <div className="rx-empty">暂无通知</div>}</section> : <div className="rx-two-col"><section className="rx-list" aria-busy={reminders === null || busy}>{reminders === null ? <div className="rx-empty">正在读取提醒…</div> : reminders.length ? reminders.map((item) => <article className="rx-list-row" key={item.id}><span className="rx-signal" /><div><strong>{item.title}</strong><p>{formatDate(item.remindAt)} · {repeatLabel[item.repeatRule] || item.repeatRule}</p></div><em>{statusLabel[item.status] || item.status}</em><button disabled={busy} onClick={() => remove(item)}>删除</button></article>) : <div className="rx-empty">暂无提醒</div>}</section><form className="rx-form-card" onSubmit={create}><span className="rx-kicker">NEW REMINDER</span><h3>新建本地提醒</h3><label>标题<input required maxLength="120" disabled={busy} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>时间<input required type="datetime-local" disabled={busy} value={form.remindAt} onChange={(e) => setForm({ ...form, remindAt: e.target.value })} /></label><label>重复<select disabled={busy} value={form.repeatRule} onChange={(e) => setForm({ ...form, repeatRule: e.target.value })}><option value="none">不重复</option><option value="daily">每天</option><option value="weekly">每周</option></select></label><button className="rx-button rx-button--primary" disabled={busy}>{busy ? '正在保存…' : '创建提醒'}</button></form></div>}
  </Modal>;
}

const repeatLabel = { none: '不重复', daily: '每天', weekly: '每周' };
const statusLabel = { pending: '待提醒', done: '已完成', dismissed: '已忽略' };
function formatDate(value) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '时间未设置'; }
function messageOf(reason) { return reason?.message || '操作没有完成，请稍后重试。'; }
