import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/Modal.jsx';

const priorityRank = { 高: 0, 中: 1, 低: 2 };
const statusLabel = { todo: '待处理', doing: '进行中', done: '已完成' };

export function TaskCenter({ onClose }) {
  const [groups, setGroups] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('position');
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError('');
    try {
      const data = await window.deskforge.tasks.list();
      setGroups(data);
      setSelectedId((current) => {
        const ids = data.flatMap((group) => group.tasks.map((task) => task.id));
        return ids.includes(current) ? current : data[0]?.tasks[0]?.id || null;
      });
    } catch (reason) {
      setError(messageOf(reason));
      setGroups((current) => current || []);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const allTasks = useMemo(() => (groups || []).flatMap((group) => group.tasks.map((task) => ({
    ...task,
    groupName: group.name,
    groupId: group.id,
  }))), [groups]);

  const tasks = useMemo(() => allTasks
    .filter((task) => (status === 'all' || task.status === status)
      && `${task.id} ${task.name} ${task.description || ''}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'priority'
      ? priorityRank[a.priority] - priorityRank[b.priority]
      : sort === 'name'
        ? a.name.localeCompare(b.name, 'zh-CN')
        : String(a.id).localeCompare(String(b.id))), [allTasks, query, status, sort]);

  const selected = allTasks.find((task) => task.id === selectedId);

  async function perform(action, after) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
      after?.();
      await reload();
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  function save(form) {
    return perform(
      () => selected ? window.deskforge.tasks.update(selected.id, form) : window.deskforge.tasks.create(form),
      () => setEditing(false),
    );
  }

  function archive() {
    if (!selected || !window.confirm(`归档任务“${selected.name}”？\n归档后它将不再出现在活动任务列表。`)) return;
    perform(() => window.deskforge.tasks.archive(selected.id), () => { setSelectedId(null); setEditing(false); });
  }

  function remove() {
    if (!selected || !window.confirm(`永久删除任务“${selected.name}”？\n此操作无法撤销。`)) return;
    perform(() => window.deskforge.tasks.remove(selected.id), () => { setSelectedId(null); setEditing(false); });
  }

  return <Modal title="任务管理" onClose={onClose} footer={<span className="rx-status">{tasks.length} 项任务</span>}>
    {error && <div className="rx-inline-error" role="alert">{error}<button onClick={reload}>重试</button></div>}
    <div className="rx-task-toolbar">
      <input placeholder="搜索任务、编号或描述" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">全部状态</option><option value="todo">待处理</option><option value="doing">进行中</option><option value="done">已完成</option></select>
      <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="position">任务编号</option><option value="priority">优先级</option><option value="name">名称</option></select>
      <button className="rx-button rx-button--primary" disabled={busy || groups === null} onClick={() => { setSelectedId(null); setEditing(true); }}>新建任务</button>
    </div>
    <div className="rx-task-layout" aria-busy={groups === null || busy}>
      <section className="rx-task-table">
        <div className="rx-task-table-head"><span>任务</span><span>优先级</span><span>状态</span><span>截止</span></div>
        {groups === null && <div className="rx-empty">正在读取任务…</div>}
        {groups !== null && tasks.length === 0 && <div className="rx-empty">没有符合条件的任务</div>}
        {tasks.map((task) => <button className={`rx-task-row ${selectedId === task.id ? 'active' : ''}`} key={task.id} onClick={() => { setSelectedId(task.id); setEditing(false); }}>
          <div><small>{task.id} / {task.groupName}</small><strong>{task.name}</strong></div>
          <span className={`rx-priority p-${task.priority}`}>{task.priority}</span>
          <span>{statusLabel[task.status] || task.status}</span>
          <time>{task.deadline || '—'}</time>
        </button>)}
      </section>
      <aside className="rx-task-detail">
        {editing ? <TaskForm groups={groups || []} task={selected} busy={busy} onSave={save} onCancel={() => setEditing(false)} /> : selected ? <>
          <span className="rx-kicker">{selected.id}</span><h2>{selected.name}</h2><p>{selected.description || '暂无任务描述'}</p>
          <dl><div><dt>状态</dt><dd>{statusLabel[selected.status] || selected.status}</dd></div><div><dt>优先级</dt><dd>{selected.priority}</dd></div><div><dt>负责人</dt><dd>{selected.owner}</dd></div><div><dt>截止日期</dt><dd>{selected.deadline || '未设置'}</dd></div></dl>
          <div className="rx-stack">
            <button disabled={busy} onClick={() => setEditing(true)}>编辑任务</button>
            {selected.status !== 'done' && <button disabled={busy} onClick={() => perform(() => window.deskforge.tasks.complete(selected.id))}>标记完成</button>}
            <button disabled={busy} onClick={archive}>归档任务</button>
            <button className="danger" disabled={busy} onClick={remove}>删除任务</button>
          </div>
        </> : <div className="rx-empty">选择任务查看详情</div>}
      </aside>
    </div>
  </Modal>;
}

function TaskForm({ groups, task, busy, onSave, onCancel }) {
  const [form, setForm] = useState({ id: task?.id || `DF-${Date.now().toString().slice(-6)}`, groupId: task?.groupId || groups[0]?.id || '', name: task?.name || '', description: task?.description || '', priority: task?.priority || '中', status: task?.status || 'todo', deadline: task?.deadline || '', owner: task?.owner || 'owner', participant: Boolean(task?.participant) });
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <form className="rx-task-form" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
    <span className="rx-kicker">{task ? 'EDIT TASK' : 'NEW TASK'}</span>
    <label>编号<input disabled={Boolean(task) || busy} required value={form.id} onChange={(event) => set('id', event.target.value)} /></label>
    <label>名称<input required disabled={busy} value={form.name} onChange={(event) => set('name', event.target.value)} /></label>
    <label>描述<textarea disabled={busy} value={form.description} onChange={(event) => set('description', event.target.value)} /></label>
    <div className="rx-grid">
      <label>分组<select required disabled={busy} value={form.groupId} onChange={(event) => set('groupId', Number(event.target.value))}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
      <label>优先级<select disabled={busy} value={form.priority} onChange={(event) => set('priority', event.target.value)}><option>高</option><option>中</option><option>低</option></select></label>
      <label>状态<select disabled={busy} value={form.status} onChange={(event) => set('status', event.target.value)}><option value="todo">待处理</option><option value="doing">进行中</option><option value="done">已完成</option></select></label>
      <label>截止<input type="date" disabled={busy} value={form.deadline || ''} onChange={(event) => set('deadline', event.target.value)} /></label>
    </div>
    <label>负责人<input disabled={busy} value={form.owner} onChange={(event) => set('owner', event.target.value)} /></label>
    <div className="rx-actions"><button type="button" disabled={busy} onClick={onCancel}>取消</button><button className="rx-button rx-button--primary" disabled={busy || !groups.length}>{busy ? '正在保存…' : '保存'}</button></div>
  </form>;
}

function messageOf(reason) { return reason?.message || '操作没有完成，请稍后重试。'; }
