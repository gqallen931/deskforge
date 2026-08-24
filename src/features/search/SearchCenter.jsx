import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/Modal.jsx';

const GROUPS = [
  { key: 'tasks', label: '任务', mark: 'TASK' },
  { key: 'projects', label: '项目', mark: 'PROJ' },
  { key: 'files', label: '文件', mark: 'FILE' },
];

export function SearchCenter({ initialQuery = '', onClose }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const search = useCallback(async (value) => {
    const normalized = value.trim();
    if (!normalized) { setResults(null); setError(''); return; }
    const id = ++requestId.current;
    setBusy(true); setError('');
    try {
      const next = await window.deskforge.workbench.search(normalized);
      if (id === requestId.current) setResults(next);
    } catch (err) {
      if (id === requestId.current) setError(err.message || '搜索失败，请稍后重试');
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }, []);

  useEffect(() => { search(initialQuery); }, [initialQuery, search]);
  const total = results ? GROUPS.reduce((sum, group) => sum + (results[group.key]?.length || 0), 0) : 0;

  return <Modal title="全局搜索" onClose={onClose} footer={<span className="rx-status">{busy ? '正在搜索…' : results ? `${total} 条匹配结果` : '任务 · 项目 · 本地文件'}</span>}>
    <form className="rx-global-search" onSubmit={(event) => { event.preventDefault(); search(query); }}>
      <span aria-hidden="true">⌕</span>
      <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索任务、项目或文件" maxLength={100} aria-label="全局搜索关键词" />
      <button className="rx-button rx-button--primary" disabled={busy || !query.trim()}>搜索</button>
    </form>
    {error && <div className="rx-notice" role="alert">{error}</div>}
    {!results && !busy && <div className="rx-empty">输入关键词，搜索保存在本机工作台中的内容。</div>}
    {results && total === 0 && <div className="rx-empty">没有找到与“{query.trim()}”匹配的内容。</div>}
    {results && total > 0 && <div className="rx-search-groups">
      {GROUPS.map((group) => {
        const items = results[group.key] || [];
        if (!items.length) return null;
        return <section className="rx-search-group" key={group.key}>
          <div className="rx-card-head"><h3>{group.label}</h3><span className="rx-muted">{items.length} 条</span></div>
          <div className="rx-search-results">{items.map((item) => <article className="rx-search-result" key={`${item.type}-${item.id}`}>
            <span>{group.mark}</span>
            <div><strong>{item.name}</strong><small>{item.path || (item.type === 'task' ? item.id : `#${item.id}`)}</small></div>
            {item.type === 'file' && <button onClick={() => window.deskforge.files.open(item.path)}>打开</button>}
          </article>)}</div>
        </section>;
      })}
    </div>}
  </Modal>;
}
