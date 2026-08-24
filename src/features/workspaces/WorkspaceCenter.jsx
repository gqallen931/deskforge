import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../../components/Modal.jsx';

const PALETTE = ['#2fe387', '#4c8dff', '#b17cf5', '#ffb454', '#ff7772', '#39c5cf', '#f28dd8', '#a8c95f'];

export function WorkspaceCenter({ onClose }) {
  const [workspaces, setWorkspaces] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    setError(false);
    return Promise.all([
      window.deskforge.workspaces.stats(),
      window.deskforge.workbench.dashboard(),
    ])
      .then(([stats, dash]) => { setWorkspaces(stats); setGlobalStats(dash.stats); })
      .catch(() => setError(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshFrame = () => window.postMessage({ type: 'deskforge:workspace-changed' }, '*');

  const switchWorkspace = async (id) => {
    if (busy) return;
    setBusy(true); setNotice('');
    try {
      await window.deskforge.workspaces.switch(id);
      refreshFrame();
      await load();
    } catch (err) { setNotice(err.message || '切换工作区失败'); }
    setBusy(false);
  };

  const createWorkspace = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true); setNotice('');
    try {
      const created = await window.deskforge.workspaces.create({ name });
      if (created && created.id) await window.deskforge.workspaces.switch(created.id);
      setNewName('');
      refreshFrame();
      await load();
    } catch (err) { setNotice(err.message || '创建工作区失败'); }
    setBusy(false);
  };

  if (error) {
    return <Modal title="工作区管理" onClose={onClose}><div className="rx-empty">工作区数据加载失败，请稍后重试</div></Modal>;
  }
  if (!workspaces || !globalStats) {
    return <Modal title="工作区管理" onClose={onClose}><div className="rx-loading">正在加载工作区…</div></Modal>;
  }

  const total = Number(globalStats.total) || 0;
  const doing = Number(globalStats.doing) || 0;
  const done = Number(globalStats.done) || 0;
  const overdue = Number(globalStats.overdue) || 0;

  return (
    <Modal title="工作区管理" onClose={onClose} footer={<span className="rx-status">任务不归属工作区 · 统计为全局数据</span>}>
      <div className="rx-stat-grid">
        <div className="rx-stat green"><span>任务总数</span><strong>{total}</strong><small>全部工作区</small><i /></div>
        <div className="rx-stat blue"><span>进行中</span><strong>{doing}</strong><small>当前进行</small><i /></div>
        <div className="rx-stat violet"><span>已完成</span><strong>{done}</strong><small>完成率 {total ? Math.round((done * 100) / total) : 0}%</small><i /></div>
        <div className="rx-stat red"><span>已逾期</span><strong>{overdue}</strong><small>需重点关注</small><i /></div>
      </div>

      <div className="rx-card-head"><h3>工作区列表</h3><span className="rx-status">{workspaces.length} 个</span></div>
      <div className="rx-workspace-grid">
        {workspaces.length === 0
          ? <div className="rx-empty">暂无工作区</div>
          : workspaces.map((ws) => {
            const rate = ws.taskCount ? Math.round((ws.doneCount * 100) / ws.taskCount) : 0;
            return (
              <div className={'rx-workspace-card' + (ws.active ? ' active' : '')} key={ws.id}>
                <div className="rx-workspace-top">
                  <span className="rx-member-avatar" style={{ background: PALETTE[ws.id % PALETTE.length] }}>{ws.name[0]}</span>
                  <strong>{ws.name}</strong>
                  {ws.active
                    ? <em className="rx-workspace-badge">当前</em>
                    : <button className="rx-workspace-switch" onClick={() => switchWorkspace(ws.id)} disabled={busy}>切换</button>}
                </div>
                <div className="rx-member-metrics">
                  <span>项目<b>{ws.projectCount}</b></span>
                  <span>任务<b>{ws.taskCount}</b></span>
                  <span>文件<b>{ws.fileCount}</b></span>
                </div>
                <div className="rx-workspace-progress"><i><b style={{ width: `${rate}%` }} /></i><em>{rate}% 已完成</em></div>
              </div>
            );
          })}
      </div>

      <div className="rx-workspace-new">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') createWorkspace(); }}
          placeholder="新工作区名称（如：产品设计）"
          maxLength={60}
        />
        <button className="rx-button rx-button--primary" onClick={createWorkspace} disabled={busy || !newName.trim()}>新建并切换</button>
      </div>
      {notice && <div className="rx-notice">{notice}</div>}
    </Modal>
  );
}
