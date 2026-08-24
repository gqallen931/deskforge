import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/Modal.jsx';

const statusLabel = { todo: '待处理', doing: '进行中', done: '已完成' };

export function ProjectsCenter({ onClose }) {
  const [projects, setProjects] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [assignCode, setAssignCode] = useState('');
  const [form, setForm] = useState({ name: '', description: '', deadline: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError('');
    try {
      const [nextProjects, nextGroups] = await Promise.all([window.deskforge.projects.list(), window.deskforge.tasks.list()]);
      setProjects(nextProjects);
      setGroups(nextGroups);
      setSelectedId((current) => nextProjects.some((project) => project.id === current) ? current : nextProjects[0]?.id || null);
    } catch (reason) {
      setError(messageOf(reason));
      setProjects((current) => current || []);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    let active = true;
    if (!selectedId) { setProjectTasks([]); return undefined; }
    window.deskforge.projects.tasks(selectedId)
      .then((tasks) => { if (active) setProjectTasks(tasks); })
      .catch((reason) => { if (active) setError(messageOf(reason)); });
    return () => { active = false; };
  }, [selectedId]);

  const selected = projects?.find((project) => project.id === selectedId);
  const assignedCodes = useMemo(() => new Set(projectTasks.map((task) => task.code)), [projectTasks]);
  const availableTasks = useMemo(() => groups.flatMap((group) => group.tasks).filter((task) => !assignedCodes.has(task.id)), [groups, assignedCodes]);
  useEffect(() => { setAssignCode((current) => availableTasks.some((task) => task.id === current) ? current : availableTasks[0]?.id || ''); }, [availableTasks]);

  async function perform(action, after) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); after?.(); await reload(); }
    catch (reason) { setError(messageOf(reason)); }
    finally { setBusy(false); }
  }

  function create(event) {
    event.preventDefault();
    perform(() => window.deskforge.projects.create(form), () => setForm({ name: '', description: '', deadline: '' }));
  }

  function archive() {
    if (!selected || !window.confirm(`归档项目“${selected.name}”？\n项目中的任务不会被删除。`)) return;
    perform(() => window.deskforge.projects.archive(selected.id), () => setSelectedId(null));
  }

  function assign() {
    if (!selected || !assignCode) return;
    perform(() => window.deskforge.projects.assignTask(selected.id, assignCode));
  }

  function unassign(task) {
    if (!window.confirm(`将任务“${task.name}”移出当前项目？`)) return;
    perform(() => window.deskforge.projects.unassignTask(task.code));
  }

  return <Modal title="项目总览" onClose={onClose} footer={<button className="rx-button rx-button--ghost" onClick={onClose}>关闭</button>}>
    {error && <div className="rx-inline-error" role="alert">{error}<button onClick={reload}>重试</button></div>}
    <div className="rx-project-layout" aria-busy={projects === null || busy}>
      <aside className="rx-project-rail"><form onSubmit={create}>
        <span className="rx-kicker">NEW PROJECT</span>
        <input required disabled={busy} placeholder="项目名称" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <textarea disabled={busy} placeholder="项目描述" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <input type="date" disabled={busy} value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} />
        <button className="rx-button rx-button--primary" disabled={busy}>{busy ? '正在保存…' : '创建项目'}</button>
      </form></aside>
      <section className="rx-project-board">
        {projects === null && <div className="rx-empty">正在读取项目…</div>}
        {projects?.length === 0 && <div className="rx-empty">还没有项目，可从左侧创建。</div>}
        <div className="rx-project-cards">{projects?.map((project) => <button key={project.id} className={`rx-project-card ${selectedId === project.id ? 'active' : ''}`} onClick={() => setSelectedId(project.id)}><span>{project.progress}%</span><strong>{project.name}</strong><small>{project.doneCount}/{project.taskCount} 项任务</small><i style={{ '--progress': `${project.progress}%` }} /></button>)}</div>
        {selected && <div className="rx-project-detail">
          <div className="rx-list-toolbar"><div><h3>{selected.name}</h3><p>{selected.description || '暂无描述'}</p></div><button disabled={busy} onClick={archive}>归档项目</button></div>
          <div className="rx-assign"><select disabled={busy || !availableTasks.length} value={assignCode} onChange={(event) => setAssignCode(event.target.value)}>{availableTasks.map((task) => <option key={task.id} value={task.id}>{task.id} · {task.name}</option>)}</select><button disabled={busy || !assignCode} onClick={assign}>{availableTasks.length ? '加入任务' : '没有可加入任务'}</button></div>
          {projectTasks.length === 0 && <div className="rx-empty">当前项目还没有任务</div>}
          {projectTasks.map((task) => <article className="rx-list-row" key={task.code}><div><strong>{task.name}</strong><p>{task.code} · {statusLabel[task.status] || task.status} · {task.priority}</p></div><button disabled={busy} onClick={() => unassign(task)}>移出</button></article>)}
        </div>}
      </section>
    </div>
  </Modal>;
}

function messageOf(reason) { return reason?.message || '操作没有完成，请稍后重试。'; }
