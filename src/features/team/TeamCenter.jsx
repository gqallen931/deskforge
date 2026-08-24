import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/Modal.jsx';

const PALETTE = ['#38c172', '#4094f7', '#9d7bfa', '#ff6b6b', '#f7b731', '#2ed8d8', '#ff9f43', '#54a0ff'];

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function TeamCenter({ onClose }) {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    window.deskforge.tasks.list()
      .then(setGroups)
      .catch(() => setError(true));
  }, []);

  const members = useMemo(() => {
    const today = todayKey();
    const map = {};
    (groups || []).flatMap((g) => g.tasks || []).forEach((task) => {
      const name = String(task.owner || '未分配').trim() || '未分配';
      const entry = map[name] || (map[name] = { name, total: 0, doing: 0, done: 0, overdue: 0 });
      entry.total += 1;
      if (task.status === 'doing') entry.doing += 1;
      if (task.status === 'done') entry.done += 1;
      if (task.status !== 'done' && task.deadline && String(task.deadline).slice(0, 10) < today) entry.overdue += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total || b.overdue - a.overdue);
  }, [groups]);

  const overall = useMemo(() => {
    const sum = (key) => members.reduce((acc, m) => acc + m[key], 0);
    return { total: sum('total'), doing: sum('doing'), done: sum('done'), overdue: sum('overdue') };
  }, [members]);

  if (error) {
    return <Modal title="团队协作" onClose={onClose}><div className="rx-empty">团队数据加载失败，请稍后重试</div></Modal>;
  }
  if (!groups) {
    return <Modal title="团队协作" onClose={onClose}><div className="rx-loading">正在加载团队数据…</div></Modal>;
  }

  return (
    <Modal title="团队协作" onClose={onClose} footer={<span className="rx-status">共 {members.length} 名成员 · {overall.total} 项任务</span>}>
      <div className="rx-stat-grid">
        <div className="rx-stat green"><span>成员总数</span><strong>{members.length}</strong><small>参与任务分配</small><i /></div>
        <div className="rx-stat blue"><span>进行中</span><strong>{overall.doing}</strong><small>团队成员任务</small><i /></div>
        <div className="rx-stat violet"><span>已完成</span><strong>{overall.done}</strong><small>全部成员合计</small><i /></div>
        <div className="rx-stat red"><span>已逾期</span><strong>{overall.overdue}</strong><small>需重点关注</small><i /></div>
      </div>

      <div className="rx-card-head"><h3>成员任务负载</h3></div>
      {members.length === 0 ? <div className="rx-empty">暂无成员任务数据</div> : (
        <div className="rx-member-grid">
          {members.map((member, index) => {
            const load = overall.total ? Math.round((member.total * 100) / overall.total) : 0;
            return (
              <div className="rx-member-card" key={member.name}>
                <div className="rx-member-top">
                  <span className="rx-member-avatar" style={{ background: PALETTE[index % PALETTE.length] }}>{member.name.slice(0, 1).toUpperCase()}</span>
                  <strong>{member.name}</strong>
                  <em>{member.total} 项</em>
                </div>
                <i className="rx-member-bar"><b style={{ width: `${load}%` }} /></i>
                <div className="rx-member-metrics">
                  <span>进行中 <b>{member.doing}</b></span>
                  <span>已完成 <b>{member.done}</b></span>
                  <span className={member.overdue ? 'danger' : ''}>逾期 <b>{member.overdue}</b></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
