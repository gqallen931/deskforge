import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal.jsx';

export function FilesCenter({ onClose }) {
  const [files, setFiles] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setError('');
    try { setFiles(await window.deskforge.files.list()); }
    catch (reason) { setError(messageOf(reason)); setFiles((current) => current || []); }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    setBusy(true);
    setError('');
    try { await window.deskforge.files.add(); await load(); }
    catch (reason) { setError(messageOf(reason)); }
    finally { setBusy(false); }
  };

  const open = async (file) => {
    setError('');
    try { await window.deskforge.files.open(file.path); }
    catch (reason) { setError(messageOf(reason)); }
  };

  const remove = async (file) => {
    if (!window.confirm(`仅移除“${file.name}”的 Deskforge 索引？\n原文件不会被删除。`)) return;
    setBusy(true);
    setError('');
    try { await window.deskforge.files.remove(file.id); await load(); }
    catch (reason) { setError(messageOf(reason)); }
    finally { setBusy(false); }
  };

  return <Modal title="文件归档 / 知识库" onClose={onClose} footer={<span className="rx-status">{files?.length || 0} 个本地文件</span>}>
    <div className="rx-list-toolbar">
      <div><span className="rx-kicker">LOCAL LIBRARY</span><h3>工作区文件</h3><p>只保存文件索引，原文件仍留在你的电脑中。</p></div>
      <button className="rx-button rx-button--primary" disabled={busy} onClick={add}>{busy ? '正在添加…' : '＋ 添加文件'}</button>
    </div>
    {error && <div className="rx-inline-error" role="alert">{error}<button onClick={load}>重试</button></div>}
    <section className="rx-file-grid" aria-busy={files === null || busy}>
      {files === null && <div className="rx-empty">正在读取本地文件索引…</div>}
      {files?.map((file) => <article className="rx-file-card" key={file.id}>
        <div className="rx-file-mark">{extension(file.name)}</div>
        <div><strong>{file.name}</strong><p>{file.path}</p><small>{formatSize(file.size)} · {formatDate(file.createdAt)}</small></div>
        <div className="rx-file-actions"><button disabled={busy} onClick={() => open(file)}>打开</button><button className="danger" disabled={busy} onClick={() => remove(file)}>移除索引</button></div>
      </article>)}
      {files?.length === 0 && <div className="rx-empty">还没有归档文件，点击“添加文件”建立本地索引。</div>}
    </section>
  </Modal>;
}

function extension(name = '') { const part = name.split('.').pop(); return (part === name ? 'FILE' : part).slice(0, 4).toUpperCase(); }
function formatSize(value = 0) { if (value < 1024) return `${value} B`; if (value < 1024 ** 2) return `${Math.round(value / 1024)} KB`; return `${(value / 1024 ** 2).toFixed(1)} MB`; }
function formatDate(value) { return value ? new Date(value).toLocaleDateString('zh-CN') : '本地文件'; }
function messageOf(reason) { return reason?.message || '操作没有完成，请稍后重试。'; }
