import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/Modal.jsx';

export function AnalysisCenter({ onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    window.deskforge.workbench.dashboard()
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const stats = useMemo(() => {
    const raw = data?.stats || {};
    const total = Number(raw.total) || 0;
    const doing = Number(raw.doing) || 0;
    const done = Number(raw.done) || 0;
    const overdue = Number(raw.overdue) || 0;
    const todo = Math.max(0, total - doing - done);
    return { total, doing, done, overdue, todo, doneRate: total ? Math.round((done * 100) / total) : 0, doingRate: total ? Math.round((doing * 100) / total) : 0 };
  }, [data]);

  if (error) {
    return <Modal title="智能分析" onClose={onClose}><div className="rx-empty">分析数据加载失败，请稍后重试</div></Modal>;
  }
  if (!data) {
    return <Modal title="智能分析" onClose={onClose}><div className="rx-loading">正在加载分析数据…</div></Modal>;
  }

  const projects = (data.projects || []).slice(0, 8);
  const files = (data.files || []).slice(0, 6);
  const openFiles = () => { onClose(); window.parent.postMessage({ type: 'deskforge:open-module', module: 'files' }, '*'); };

  return (
    <Modal title="智能分析" onClose={onClose} footer={<span className="rx-status">工作区 · {data.workspace?.name || '默认'}</span>}>
      <div className="rx-stat-grid">
        <div className="rx-stat green"><span>任务总数</span><strong>{stats.total}</strong><small>全部任务</small><i /></div>
        <div className="rx-stat blue"><span>进行中</span><strong>{stats.doing}</strong><small>占比 {stats.doingRate}%</small><i /></div>
        <div className="rx-stat violet"><span>已完成</span><strong>{stats.done}</strong><small>完成率 {stats.doneRate}%</small><i /></div>
        <div className="rx-stat red"><span>已逾期</span><strong>{stats.overdue}</strong><small>需重点关注</small><i /></div>
      </div>

      <div className="rx-overview-grid">
        <section className="rx-overview-card">
          <div className="rx-card-head"><h3>任务流程分布</h3></div>
          <div className="rx-flow">
            <div><span>待处理</span><b>{stats.todo}</b></div>
            <div className="active"><span>进行中</span><b>{stats.doing}</b></div>
            <div><span>已完成</span><b>{stats.done}</b></div>
          </div>
          <div className="rx-card-head" style={{ marginTop: 18 }}><h3>项目进度</h3></div>
          {projects.length === 0 ? <div className="rx-empty">暂无项目</div> : projects.map((project) => (
            <div className="rx-project-pulse" key={project.id}>
              <strong>{project.name}</strong>
              <i><b style={{ width: `${project.progress || 0}%` }} /></i>
              <em>{project.progress || 0}% · {project.taskCount || 0} 项</em>
            </div>
          ))}
        </section>

        <section className="rx-overview-card">
          <div className="rx-card-head"><h3>工作区概览</h3></div>
          <dl className="rx-system-row"><span>当前工作区</span><b>{data.workspace?.name || '—'}</b></dl>
          <dl className="rx-system-row"><span>项目数量</span><b>{(data.projects || []).length}</b></dl>
          <dl className="rx-system-row"><span>文件数量</span><b>{(data.files || []).length}</b></dl>
          <dl className="rx-system-row"><span>标签数量</span><b>{(data.tags || []).length}</b></dl>
          <div className="rx-card-head" style={{ marginTop: 18 }}><h3>最近文件</h3><button onClick={openFiles}>全部文件</button></div>
          <div className="rx-file-grid">
            {files.length === 0 ? <div className="rx-empty">暂无文件</div> : files.map((file) => (
              <div className="rx-file-card" key={file.id}>
                <span className="rx-file-mark">{(file.extension || 'FILE').slice(0, 6).toUpperCase()}</span>
                <div><strong>{file.name}</strong><p>{file.path}</p></div>
                <small>{file.size ? `${Math.round(file.size / 1024)} KB` : '—'}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}
