import { useEffect, useRef } from 'react';

export function Modal({ title, children, onClose, footer }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const focusable = () => [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    (dialog.querySelector('[autofocus]') || focusable()[0])?.focus();
    const keydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [onClose]);
  return <div className="rx-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="rx-modal" role="dialog" aria-modal="true" aria-label={title}>
      <header><div><span className="rx-kicker">DESKFORGE / LOCAL</span><h2>{title}</h2></div><button className="rx-icon-button" onClick={onClose} aria-label="关闭">×</button></header>
      <div className="rx-modal-body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </section>
  </div>;
}
