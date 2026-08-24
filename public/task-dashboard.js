/**
 * Deskforge Dashboard — 交互逻辑层 v1.0
 * ================================================================
 * 独立交互文件，配合 task-dashboard.html 使用。
 * 全部功能通过事件委托 + 动态样式注入实现，不修改原始 HTML。
 *
 * 功能清单：
 *   1. Toast 通知系统（成功 / 错误 / 信息）
 *   2. Modal 模态框系统（新增任务 / 编辑任务 / 完成任务 / AI 建议 / 删除确认）
 *   3. Dropdown 下拉系统（状态筛选 / 排序 / 快捷筛选 / 通知 / 消息 /
 *      新建菜单 / 用户菜单 / 更多操作 / 添加标签 / 甘特视图）
 *   4. 任务筛选联动（标签页 + 状态 + 快捷筛选 + 搜索四重过滤）
 *   5. 甘特图交互（周/月视图切换、前后翻页、回到今天）
 *   6. 3D 卡片扇轮播（鼠标滚轮 / 拖拽 / 点击 / 键盘方向键）
 *   7. 统计数字联动动画（完成任务时数字滚动）
 * ================================================================
 */
(function () {
  'use strict';

  /* ================================================================
     0. 工具函数
     ================================================================ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function createEl(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = html.trim();
    return tpl.content.firstElementChild;
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ICONS = {
    plus:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    check:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    x:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    edit:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    link:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
    user:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    logout:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    gear:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    folder:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    import:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    bell:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    spark:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.7L19.6 10l-5.7 1.9L12 17.6l-1.9-5.7L4.4 10l5.7-1.9L12 3z"/></svg>',
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    alert:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    doc:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    layers:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    image:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    code:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  };

  function icon(name) { return ICONS[name] || ''; }

  /* ================================================================
     1. 动态样式注入（交互组件专用，全部 wbi- 前缀，不污染原页面）
     ================================================================ */
  function injectStyles() {
    var css = `
/* ── 交互层通用 ── */
.wbi-hidden { display: none !important; }

/* ── Toast ── */
.wbi-toasts {
  position: fixed; right: 20px; bottom: 20px; z-index: 2000;
  display: flex; flex-direction: column; gap: 10px; align-items: flex-end;
  pointer-events: none;
}
.wbi-toast {
  display: flex; align-items: center; gap: 9px;
  min-width: 220px; max-width: 340px;
  padding: 11px 15px;
  background: rgba(24, 26, 31, 0.92);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 11px;
  color: #eceef1; font-size: 12.5px;
  box-shadow: 0 10px 34px rgba(0,0,0,.5);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  pointer-events: auto;
  animation: wbi-toast-in .28s cubic-bezier(.22,.61,.36,1) both;
}
.wbi-toast--out { animation: wbi-toast-out .22s ease both; }
.wbi-toast svg { width: 15px; height: 15px; flex-shrink: 0; }
.wbi-toast--success svg { color: #2fe387; }
.wbi-toast--error   svg { color: #ff6b6b; }
.wbi-toast--info    svg { color: #4c8dff; }
@keyframes wbi-toast-in  { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
@keyframes wbi-toast-out { from { opacity: 1; } to { opacity: 0; transform: translateX(24px); } }

/* ── Modal ── */
.wbi-overlay {
  position: fixed; inset: 0; z-index: 1500;
  display: flex; align-items: center; justify-content: center;
  background: rgba(4, 5, 7, 0.62);
  backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
  animation: wbi-fade-in .2s ease both;
  padding: 24px;
}
.wbi-overlay--closing { animation: wbi-fade-out .18s ease both; }
.wbi-modal {
  width: 460px; max-width: 100%;
  max-height: calc(100vh - 60px);
  display: flex; flex-direction: column;
  background: #17181d;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 15px;
  box-shadow: 0 30px 80px rgba(0,0,0,.6);
  animation: wbi-modal-in .26s cubic-bezier(.22,.61,.36,1) both;
  color-scheme: dark;
}
.wbi-overlay--closing .wbi-modal { animation: wbi-modal-out .18s ease both; }
.wbi-modal--sm { width: 380px; }
@keyframes wbi-fade-in  { from { opacity: 0; } to { opacity: 1; } }
@keyframes wbi-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes wbi-modal-in  { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes wbi-modal-out { from { opacity: 1; } to { opacity: 0; transform: translateY(8px) scale(.98); } }

.wbi-modal__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 17px 20px 14px;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.wbi-modal__title { font-size: 15px; font-weight: 700; color: #eceef1; letter-spacing: .2px; }
.wbi-modal__close {
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: #9aa0a8; transition: all .15s;
}
.wbi-modal__close:hover { background: rgba(255,255,255,.07); color: #fff; }
.wbi-modal__close svg { width: 14px; height: 14px; }
.wbi-modal__body { padding: 18px 20px; overflow-y: auto; }
.wbi-modal__foot {
  display: flex; justify-content: flex-end; gap: 9px;
  padding: 14px 20px 17px;
  border-top: 1px solid rgba(255,255,255,.06);
}

/* ── 表单控件 ── */
.wbi-field { margin-bottom: 15px; }
.wbi-field:last-child { margin-bottom: 0; }
.wbi-field__label { display: block; font-size: 12px; font-weight: 500; color: #9aa0a8; margin-bottom: 7px; }
.wbi-field__label em { color: #ff6b6b; font-style: normal; }
.wbi-input, .wbi-select, .wbi-textarea {
  width: 100%;
  padding: 9px 12px;
  background: rgba(255,255,255,.045);
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 8px;
  color: #eceef1;
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
  transition: border-color .15s, background .15s;
}
.wbi-input:focus, .wbi-select:focus, .wbi-textarea:focus {
  border-color: rgba(0,220,110,.45);
  background: rgba(255,255,255,.06);
}
.wbi-input--error { border-color: rgba(242,73,73,.6) !important; animation: wbi-shake .3s ease; }
@keyframes wbi-shake { 0%,100%{transform:none} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
.wbi-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239aa0a8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 11px center;
  cursor: pointer;
}
.wbi-select option { background: #1d1f25; }
.wbi-textarea { resize: vertical; min-height: 72px; line-height: 1.6; }
.wbi-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* 分段选择器 */
.wbi-seg { display: flex; gap: 4px; padding: 3px; background: rgba(255,255,255,.05); border-radius: 9px; }
.wbi-seg__btn {
  flex: 1; padding: 7px 0; border-radius: 6px;
  font-size: 12px; color: #9aa0a8; text-align: center;
  transition: all .15s;
}
.wbi-seg__btn:hover { color: #eceef1; }
.wbi-seg__btn--on { background: rgba(255,255,255,.12); color: #fff; font-weight: 600; }
.wbi-seg__btn--on.wbi-seg__btn--high { background: rgba(242,73,73,.18); color: #ff6b6b; }
.wbi-seg__btn--on.wbi-seg__btn--mid  { background: rgba(232,176,75,.16); color: #e8b04b; }

/* ── 按钮 ── */
.wbi-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 36px; padding: 0 16px;
  border-radius: 9px; font-size: 12.5px; font-weight: 500;
  transition: all .16s; white-space: nowrap;
}
.wbi-btn svg { width: 13px; height: 13px; }
.wbi-btn--ghost { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09); color: #eceef1; }
.wbi-btn--ghost:hover { background: rgba(255,255,255,.09); }
.wbi-btn--primary {
  background: linear-gradient(180deg, #00e676, #00c763);
  color: #fff; font-weight: 600;
  box-shadow: 0 2px 12px rgba(0,220,110,.25);
}
.wbi-btn--primary:hover { filter: brightness(1.08); }
.wbi-btn--danger {
  background: linear-gradient(180deg, #f25555, #d63a3a);
  color: #fff; font-weight: 600;
  box-shadow: 0 2px 12px rgba(242,73,73,.25);
}
.wbi-btn--danger:hover { filter: brightness(1.08); }

/* ── Dropdown ── */
.wbi-drop {
  position: fixed; z-index: 1600;
  min-width: 168px;
  background: rgba(26, 28, 33, 0.96);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 11px;
  box-shadow: 0 14px 44px rgba(0,0,0,.55);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  padding: 5px;
  animation: wbi-drop-in .18s cubic-bezier(.22,.61,.36,1) both;
}
@keyframes wbi-drop-in { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: none; } }
.wbi-drop__item {
  display: flex; align-items: center; gap: 9px;
  width: 100%; padding: 8px 11px;
  border-radius: 7px; font-size: 12.5px; color: #c9cdd4;
  text-align: left; transition: all .13s;
}
.wbi-drop__item:hover { background: rgba(255,255,255,.07); color: #fff; }
.wbi-drop__item svg { width: 14px; height: 14px; opacity: .8; flex-shrink: 0; }
.wbi-drop__item--danger { color: #ff6b6b; }
.wbi-drop__item--danger:hover { background: rgba(242,73,73,.12); color: #ff6b6b; }
.wbi-drop__item--active { color: #2fe387; }
.wbi-drop__item--active::after { content: ''; margin-left: auto; width: 5px; height: 5px; border-radius: 50%; background: #2fe387; }
.wbi-drop__divider { height: 1px; margin: 5px 8px; background: rgba(255,255,255,.07); }
.wbi-drop__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 11px 9px; font-size: 12px; font-weight: 600; color: #eceef1;
}
.wbi-drop__head button { font-size: 11px; color: #2fe387; }
.wbi-drop__head button:hover { text-decoration: underline; }

/* 通知 / 消息面板 */
.wbi-note { display: flex; gap: 10px; padding: 9px 11px; border-radius: 8px; transition: background .13s; cursor: pointer; }
.wbi-note:hover { background: rgba(255,255,255,.05); }
.wbi-note__icon {
  width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,.06); color: #9aa0a8;
}
.wbi-note__icon svg { width: 14px; height: 14px; }
.wbi-note__icon--green { background: rgba(0,220,110,.12); color: #2fe387; }
.wbi-note__icon--red { background: rgba(242,73,73,.12); color: #ff6b6b; }
.wbi-note__icon--blue { background: rgba(76,141,255,.12); color: #4c8dff; }
.wbi-note__text { flex: 1; min-width: 0; font-size: 12px; color: #c9cdd4; line-height: 1.5; }
.wbi-note__time { font-size: 10.5px; color: #62686f; margin-top: 2px; }
.wbi-note__unread { width: 7px; height: 7px; border-radius: 50%; background: #00dc6e; flex-shrink: 0; margin-top: 6px; }

/* ── 描述文本 / 确认框 ── */
.wbi-confirm-text { font-size: 13px; line-height: 1.8; color: #c9cdd4; }
.wbi-confirm-text strong { color: #fff; }
.wbi-danger-tip {
  display: flex; gap: 9px; align-items: flex-start;
  margin-top: 12px; padding: 10px 12px;
  background: rgba(242,73,73,.08);
  border: 1px solid rgba(242,73,73,.2);
  border-radius: 9px; font-size: 11.5px; line-height: 1.6; color: #ff8f8f;
}
.wbi-danger-tip svg { width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px; }

/* AI 建议详情 */
.wbi-ai-doc {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; margin-bottom: 8px;
  background: rgba(255,255,255,.035);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 9px; font-size: 12.5px; color: #c9cdd4;
  cursor: pointer; transition: all .15s;
}
.wbi-ai-doc:hover { background: rgba(255,255,255,.06); border-color: rgba(0,220,110,.25); }
.wbi-ai-doc svg { width: 15px; height: 15px; color: #2fe387; flex-shrink: 0; }
.wbi-ai-doc span { flex: 1; }
.wbi-ai-doc small { color: #62686f; font-size: 10.5px; }
.wbi-ai-risk {
  display: flex; gap: 9px; margin-top: 14px; padding: 11px 13px;
  background: rgba(232,176,75,.07); border: 1px solid rgba(232,176,75,.2);
  border-radius: 9px; font-size: 12px; line-height: 1.7; color: #e8c98a;
}
.wbi-ai-risk svg { width: 15px; height: 15px; flex-shrink: 0; color: #e8b04b; }

/* ── 任务完成态 / 紧凑视图 / 空提示 ── */
.wb-task--done { opacity: .42; }
.wb-task--done .wb-task__name { text-decoration: line-through; }
.wbi-compact .wb-task { padding-top: 6px; padding-bottom: 6px; }
.wbi-compact .wb-task__id { font-size: 9.5px; }
.wbi-empty-hint {
  padding: 30px 20px; text-align: center;
  color: #62686f; font-size: 12.5px;
  border: 1px dashed rgba(255,255,255,.1);
  border-radius: 12px;
}
.wb-toolbtn--on { border-color: rgba(0,220,110,.4) !important; color: #2fe387 !important; }

/* ── 3D 卡片扇：轮播增强 ── */
.wb-fan { cursor: grab; outline: none; }
.wb-fan:active { cursor: grabbing; }
.wb-fan:focus-visible { border-color: rgba(0,220,110,.35); }
.wb-fan__card { transition: transform .5s cubic-bezier(.22,.61,.36,1), opacity .4s ease, box-shadow .4s ease !important; }

/* 居中卡：绿色高亮（轮播跟随，覆盖原 --main 固定绿与玻璃质感） */
.wb-fan__card.is-center {
  background: linear-gradient(165deg, #00e676, #00a34e 85%) !important;
  border-color: rgba(0, 255, 150, 0.38) !important;
  box-shadow: 0 24px 58px rgba(0,220,110,.38), 0 4px 14px rgba(0,0,0,.42) !important;
}
.wb-fan__card.is-center::before,
.wb-fan__card.is-center::after { display: none !important; }
.wb-fan__card.is-center .wbi-fan-tag { display: none !important; }

/* 非居中主卡：还原玻璃质感（原 HTML 中 --main 永久绿色需显式覆盖） */
.wb-fan__card--main:not(.is-center) {
  background: linear-gradient(165deg, rgba(255,255,255,0.13), rgba(255,255,255,0.03) 60%) !important;
  border-color: rgba(255,255,255,0.14) !important;
  box-shadow: 0 18px 40px rgba(0,0,0,.45) !important;
}
.wb-fan__card--main:not(.is-center)::before { display: block !important; }
.wb-fan__card--main:not(.is-center)::after { display: block !important; }
.wb-fan__card--main:not(.is-center) .wb-fan__card-icon,
.wb-fan__card--main:not(.is-center) .wb-fan__card-title { display: none !important; }

/* 居中卡专属内容（图标 + 标题） */
.wbi-fan-center {
  display: none;
  position: absolute; inset: 0; z-index: 3;
  flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; pointer-events: none;
}
.wb-fan__card.is-center .wbi-fan-center { display: flex; }
.wbi-fan-center__icon {
  width: 40px; height: 40px; border-radius: 11px;
  background: rgba(255,255,255,.18);
  border: 1px solid rgba(255,255,255,.25);
  display: flex; align-items: center; justify-content: center;
  color: #fff;
}
.wbi-fan-center__icon svg { width: 20px; height: 20px; }
.wbi-fan-center__title {
  font-size: 12.5px; font-weight: 700; color: #fff; letter-spacing: .3px;
}

.wbi-fan-tag {
  position: absolute; left: 38px; bottom: 14px; z-index: 2;
  font-size: 10px; font-weight: 600; color: rgba(255,255,255,.92);
  text-shadow: 0 1px 4px rgba(0,0,0,.6);
  letter-spacing: .3px; pointer-events: none;
}
.wb-fan__float { transition: opacity .16s ease, transform .3s cubic-bezier(.22,.61,.36,1); }
.wb-fan__float.is-switching { opacity: 0; }
.wb-fan__hint {
  position: absolute; right: 14px; bottom: 12px; z-index: 10;
  font-size: 10px; color: rgba(255,255,255,.35);
  letter-spacing: .4px; pointer-events: none;
}

/* ── 标签内联输入 ── */
.wbi-tag-input {
  width: 130px; padding: 7px 10px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(0,220,110,.35);
  border-radius: 8px; color: #eceef1;
  font-size: 12px; outline: none;
}
.wbi-settings-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.wbi-check { display:flex; align-items:center; gap:9px; color:#c8ccd1; font-size:12px; margin:10px 0; }
.wbi-check input { accent-color:#00dc6e; }
.wbi-data-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:16px; padding-top:16px; border-top:1px solid rgba(255,255,255,.08); }
body.deskforge-compact .wb-task { min-height:44px; }
body.deskforge-compact .wb-stats { gap:10px; }
body.deskforge-reduce-motion *, body.deskforge-reduce-motion *::before, body.deskforge-reduce-motion *::after { animation:none !important; transition:none !important; scroll-behavior:auto !important; }
`;
    var style = document.createElement('style');
    style.id = 'wbi-styles';
    style.textContent = css;
    document.head.appendChild(style);

    // 甘特图列数动态覆盖（周/月视图切换时更新）
    var ganttStyle = document.createElement('style');
    ganttStyle.id = 'wbi-gantt-style';
    document.head.appendChild(ganttStyle);
  }

  /* ================================================================
     2. Toast 通知系统
     ================================================================ */
  var Toast = {
    _container: null,
    _ensure: function () {
      if (!this._container) {
        this._container = createEl('<div class="wbi-toasts"></div>');
        document.body.appendChild(this._container);
      }
      return this._container;
    },
    show: function (msg, type, duration) {
      type = type || 'success';
      var iconName = type === 'success' ? 'check' : type === 'error' ? 'alert' : 'info';
      var item = createEl(
        '<div class="wbi-toast wbi-toast--' + type + '" role="status">' +
          icon(iconName) + '<span>' + esc(msg) + '</span>' +
        '</div>'
      );
      this._ensure().appendChild(item);
      setTimeout(function () {
        item.classList.add('wbi-toast--out');
        setTimeout(function () { item.remove(); }, 240);
      }, duration || 2600);
    },
    success: function (m) { this.show(m, 'success'); },
    error: function (m) { this.show(m, 'error'); },
    info: function (m) { this.show(m, 'info'); },
  };

  /* ================================================================
     3. Modal 模态框系统
     ================================================================ */
  var Modal = {
    _stack: [],

    open: function (opts) {
      var self = this;
      var overlay = createEl(
        '<div class="wbi-overlay">' +
          '<div class="wbi-modal' + (opts.small ? ' wbi-modal--sm' : '') + '" role="dialog" aria-modal="true">' +
            '<div class="wbi-modal__head">' +
              '<span class="wbi-modal__title">' + esc(opts.title || '') + '</span>' +
              '<button class="wbi-modal__close" aria-label="关闭">' + icon('x') + '</button>' +
            '</div>' +
            '<div class="wbi-modal__body"></div>' +
            (opts.footer ? '<div class="wbi-modal__foot"></div>' : '') +
          '</div>' +
        '</div>'
      );

      var modal = overlay.querySelector('.wbi-modal');
      var body = overlay.querySelector('.wbi-modal__body');
      if (typeof opts.body === 'string') body.innerHTML = opts.body;
      else if (opts.body instanceof Element) body.appendChild(opts.body);

      // 底部按钮
      if (opts.footer) {
        var foot = overlay.querySelector('.wbi-modal__foot');
        (opts.buttons || []).forEach(function (btn) {
          var b = createEl(
            '<button class="wbi-btn wbi-btn--' + (btn.kind || 'ghost') + '">' +
              (btn.icon ? icon(btn.icon) : '') + esc(btn.label) +
            '</button>'
          );
          b.addEventListener('click', async function () {
            b.disabled = true;
            try {
              var result = btn.onClick ? await btn.onClick() : undefined;
              if (btn.close !== false && result !== false) self.close(overlay);
            } catch (error) {
              Toast.error(error && error.message ? error.message : '操作失败，请重试');
            } finally {
              b.disabled = false;
            }
          });
          foot.appendChild(b);
        });
      }

      // 关闭逻辑
      overlay.querySelector('.wbi-modal__close').addEventListener('click', function () {
        self.close(overlay);
      });
      if (opts.maskClosable !== false) {
        overlay.addEventListener('mousedown', function (e) {
          if (e.target === overlay) self.close(overlay);
        });
      }

      overlay._onClose = opts.onClose || null;
      document.body.appendChild(overlay);
      this._stack.push(overlay);

      // 自动聚焦第一个输入框
      setTimeout(function () {
        var input = modal.querySelector('input, textarea, select');
        if (input) input.focus();
      }, 60);

      return overlay;
    },

    close: function (overlay) {
      overlay = overlay || this._stack[this._stack.length - 1];
      if (!overlay) return;
      var idx = this._stack.indexOf(overlay);
      if (idx > -1) this._stack.splice(idx, 1);
      overlay.classList.add('wbi-overlay--closing');
      setTimeout(function () {
        overlay.remove();
        if (overlay._onClose) overlay._onClose();
      }, 180);
    },

    closeAll: function () {
      while (this._stack.length) this.close(this._stack[this._stack.length - 1]);
    },

    isOpen: function () { return this._stack.length > 0; },
  };

  /* ================================================================
     4. Dropdown 下拉系统（单例，自动定位，外部点击/Esc 关闭）
     ================================================================ */
  var Dropdown = {
    _current: null,
    _trigger: null,

    /**
     * @param {Element} trigger 触发元素
     * @param {Array|Element} content 菜单项数组或自定义面板元素
     * @param {Object} opts { width, align: 'left'|'right' }
     * 菜单项: { icon, label, danger, active, divider, onClick }
     */
    open: function (trigger, content, opts) {
      opts = opts || {};
      // 再次点击同一触发器 → 收起
      if (this._current && this._trigger === trigger) {
        this.close();
        return;
      }
      this.close();

      var drop = createEl('<div class="wbi-drop"></div>');
      if (opts.width) drop.style.minWidth = opts.width + 'px';

      if (content instanceof Element) {
        drop.appendChild(content);
      } else {
        content.forEach(function (item) {
          if (item.divider) { drop.appendChild(createEl('<div class="wbi-drop__divider"></div>')); return; }
          var el = createEl(
            '<button class="wbi-drop__item' +
              (item.danger ? ' wbi-drop__item--danger' : '') +
              (item.active ? ' wbi-drop__item--active' : '') + '">' +
              (item.icon ? icon(item.icon) : '') +
              '<span>' + esc(item.label) + '</span>' +
            '</button>'
          );
          el.addEventListener('click', async function () {
            Dropdown.close();
            try {
              if (item.onClick) await item.onClick();
            } catch (error) {
              Toast.error(error && error.message ? error.message : '操作失败，请重试');
            }
          });
          drop.appendChild(el);
        });
      }

      document.body.appendChild(drop);

      // 定位（支持 placement: 'bottom' | 'top' | 'auto'，默认 auto 防溢出自动翻转）
      var rect = trigger.getBoundingClientRect();
      var dw = drop.offsetWidth;
      var dh = drop.offsetHeight;
      var left = opts.align === 'left' ? rect.left : rect.right - dw;
      left = Math.max(8, Math.min(left, window.innerWidth - dw - 8));
      drop.style.left = left + 'px';

      var placement = opts.placement || 'auto';
      var top;
      if (placement === 'top') {
        top = rect.top - dh - 6;
      } else if (placement === 'bottom') {
        top = rect.bottom + 6;
      } else {
        // auto：下方空间不足且上方空间足够时，自动翻转到触发器上方
        top = rect.bottom + 6;
        if (top + dh > window.innerHeight - 8 && rect.top - dh - 6 > 8) {
          top = rect.top - dh - 6;
        }
      }
      top = Math.max(8, Math.min(top, window.innerHeight - dh - 8));
      drop.style.top = top + 'px';

      this._current = drop;
      this._trigger = trigger;
    },

    close: function () {
      if (this._current) {
        this._current.remove();
        this._current = null;
        this._trigger = null;
      }
    },

    isOpen: function () { return !!this._current; },
  };

  document.addEventListener('mousedown', function (e) {
    if (Dropdown._current && !Dropdown._current.contains(e.target) &&
        !(Dropdown._trigger && Dropdown._trigger.contains(e.target))) {
      Dropdown.close();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (Dropdown.isOpen()) { Dropdown.close(); e.stopPropagation(); }
      else if (Modal.isOpen()) Modal.close();
    }
  }, true);
  window.addEventListener('resize', function () { Dropdown.close(); });

  /* ================================================================
     5. 全局状态 & 任务数据
     ================================================================ */
  var state = {
    tab: 'all',        // all | mine | joined
    status: 'all',     // all | todo | doing | done
    quick: null,       // null | today | high
    search: '',
    sort: 'default',   // default | priority | id | name
  };

  // 任务详情数据（与页面内联脚本保持一致，新增任务动态加入）
  var TASK_DETAILS = {
    'WXB-2025-001': { name: '需求评审会',   prio: '高优先级', desc: '与业务团队对齐需求范围，明确核心目标与验收标准，输出需求评审结论。', deadline: '2025-05-24 18:00', status: '进行中', priority: '高' },
    'WXB-2025-002': { name: '用户调研分析', prio: '中优先级', desc: '整理目标用户访谈记录，提炼核心诉求与行为路径，形成调研结论报告。', deadline: '2025-05-24 14:00', status: '进行中', priority: '中' },
    'WXB-2025-003': { name: '竞品功能梳理', prio: '低优先级', desc: '对标三款主流竞品，梳理任务管理模块的功能矩阵与差异化机会点。', deadline: '2025-05-25 09:30', status: '待开始', priority: '低' },
    'WXB-2025-004': { name: '交互流程设计', prio: '高优先级', desc: '完成核心任务流的交互原型，覆盖创建、分配、流转与归档全链路。', deadline: '2025-06-05 18:00', status: '进行中', priority: '高' },
    'WXB-2025-005': { name: '原型评审',     prio: '中优先级', desc: '组织设计、研发、产品三方评审高保真原型，收敛交互细节。',       deadline: '2025-06-06 12:00', status: '进行中', priority: '中' },
    'WXB-2025-006': { name: '核心功能开发', prio: '高优先级', desc: '实现任务看板、时间线与智能详情三大核心模块的前后端联调。',     deadline: '2025-06-15 18:00', status: '进行中', priority: '高' },
  };
  var taskSeq = 7;

  // 归属数据（用于"我负责的 / 我参与的"标签页过滤）
  var OWNERS = {
    'WXB-2025-001': { owner: 'brandon', part: true  },
    'WXB-2025-002': { owner: 'lifang',  part: true  },
    'WXB-2025-003': { owner: 'wangqiang', part: false },
    'WXB-2025-004': { owner: 'brandon', part: false },
    'WXB-2025-005': { owner: 'lifang',  part: false },
    'WXB-2025-006': { owner: 'wangqiang', part: true  },
  };

  /* ================================================================
     本地持久化：Electron + SQLite；浏览器预览保持无依赖
     ================================================================ */
  var persistenceReady = false;
  var saveTimer = null;
  var DESKFORGE = window.deskforge;
  try { DESKFORGE = DESKFORGE || (window.parent && window.parent.deskforge); } catch (error) {}

  function snapshotState() {
    var groups = $('.wb-groups');
    var groupsClone = groups ? groups.cloneNode(true) : null;
    if (groupsClone) groupsClone.querySelectorAll('.wbi-empty-hint').forEach(function (el) { el.remove(); });
    return {
      groupsHtml: groupsClone ? groupsClone.innerHTML : '',
      taskDetails: TASK_DETAILS,
      owners: OWNERS,
      taskSeq: taskSeq,
      filters: state,
    };
  }

  function queueSave() {
    if (DESKFORGE && DESKFORGE.tasks) return;
    if (!persistenceReady || !DESKFORGE || !DESKFORGE.storage) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      DESKFORGE.storage.save(snapshotState()).catch(function () {});
    }, 120);
  }

  async function restoreState() {
    if (!DESKFORGE || !DESKFORGE.storage) return;
    var saved = await DESKFORGE.storage.load();
    if (!saved) return;

    var groups = $('.wb-groups');
    if (groups && saved.groupsHtml) groups.innerHTML = saved.groupsHtml;
    Object.keys(TASK_DETAILS).forEach(function (key) { delete TASK_DETAILS[key]; });
    Object.keys(saved.taskDetails || {}).forEach(function (key) { TASK_DETAILS[key] = saved.taskDetails[key]; });
    Object.keys(OWNERS).forEach(function (key) { delete OWNERS[key]; });
    Object.keys(saved.owners || {}).forEach(function (key) { OWNERS[key] = saved.owners[key]; });
    taskSeq = Number(saved.taskSeq) || taskSeq;
    Object.assign(state, saved.filters || {});
  }

  function watchPersistence() {
    if (DESKFORGE && DESKFORGE.tasks) return;
    var groups = $('.wb-groups');
    if (!groups || !DESKFORGE || !DESKFORGE.storage) return;
    new MutationObserver(queueSave).observe(groups, { childList: true, subtree: true, characterData: true });
    persistenceReady = true;
    queueSave();
  }

  function hasTaskBackend() {
    return Boolean(DESKFORGE && DESKFORGE.tasks && DESKFORGE.groups);
  }

  function collectLegacyGroups() {
    return getGroups().map(function (group) {
      var dot = $('.wb-group__dot', group);
      var color = ['green', 'violet'].find(function (name) {
        return dot && dot.classList.contains('wb-group__dot--' + name);
      }) || 'blue';
      return {
        name: $('.wb-group__name', group).textContent.trim(),
        color: color,
        tasks: $$('.wb-task', group).map(function (row) {
          var id = row.getAttribute('data-task');
          var detail = TASK_DETAILS[id] || {};
          return {
            id: id,
            name: detail.name || $('.wb-task__name', row).textContent.trim(),
            description: detail.desc || '',
            priority: detail.priority || (($('.wb-badge', row) || {}).textContent || '中').trim(),
            status: row.dataset.status || 'todo',
            deadline: detail.deadline || null,
            owner: row.dataset.owner || 'brandon',
            participant: row.dataset.part !== '0',
          };
        }),
      };
    });
  }

  function renderStructuredGroups(groups) {
    var container = $('.wb-groups');
    if (!container) return;
    container.innerHTML = '';
    Object.keys(TASK_DETAILS).forEach(function (key) { delete TASK_DETAILS[key]; });
    Object.keys(OWNERS).forEach(function (key) { delete OWNERS[key]; });

    groups.forEach(function (group, groupIndex) {
      var groupEl = createEl(
        '<div class="wb-group' + (groupIndex === 2 ? ' wb-group--closed' : '') + '" data-group-id="' + group.id + '">' +
          '<button class="wb-group__head">' +
            '<span class="wb-group__dot wb-group__dot--' + esc(group.color) + '"></span>' +
            '<span class="wb-group__name">' + esc(group.name) + '</span>' +
            '<span class="wb-group__count">' + group.tasks.length + '</span>' +
            '<svg class="wb-group__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
          '</button>' +
          '<div class="wb-group__list"></div>' +
        '</div>'
      );
      var list = $('.wb-group__list', groupEl);
      group.tasks.forEach(function (task) { list.appendChild(buildTaskRowFromRecord(task)); });
      container.appendChild(groupEl);
    });

    var first = $('.wb-task');
    if (first) selectTaskRow(first);
  }

  async function initializeTaskBackend() {
    if (!hasTaskBackend()) return;
    var groups = await DESKFORGE.tasks.list();
    if (!groups.length) groups = await DESKFORGE.tasks.seed(collectLegacyGroups());
    renderStructuredGroups(groups);
  }

  function applySettings(settings) {
    if (!settings) return;
    document.body.classList.toggle('deskforge-compact', Boolean(settings.compactMode));
    document.body.classList.toggle('deskforge-reduce-motion', Boolean(settings.reduceMotion));
    var name = $('.wb-user__name');
    var role = $('.wb-user__role');
    var workspace = $('#wbWsItem');
    var avatar = $('.wb-user__avatar');
    if (name) name.textContent = settings.displayName;
    if (role) role.textContent = settings.role;
    if (workspace) workspace.childNodes.forEach(function (node) { if (node.nodeType === 3 && node.textContent.trim()) node.textContent = '\n        ' + settings.workspaceName + '\n        '; });
    if (avatar) avatar.textContent = settings.displayName.split(/\s+/).map(function (part) { return part.charAt(0); }).join('').slice(0, 2).toUpperCase() || 'DF';
  }

  async function loadSettings() {
    if (DESKFORGE && DESKFORGE.settings) applySettings(await DESKFORGE.settings.get());
  }

  async function importData() {
    if (!DESKFORGE || !DESKFORGE.data) return Toast.info('数据导入仅在 Deskforge 桌面版可用');
    var result = await DESKFORGE.data.importJson();
    if (result.canceled) return;
    Toast.success('已导入 ' + result.summary.tasks + ' 项任务，即将刷新');
    setTimeout(function () { location.reload(); }, 500);
  }

  async function exportData() {
    if (!DESKFORGE || !DESKFORGE.data) return Toast.info('数据导出仅在 Deskforge 桌面版可用');
    var result = await DESKFORGE.data.exportJson();
    if (!result.canceled) Toast.success('数据已导出');
  }

  async function createBackup() {
    if (!DESKFORGE || !DESKFORGE.data) return Toast.info('备份仅在 Deskforge 桌面版可用');
    await DESKFORGE.data.backup();
    Toast.success('本地备份已创建');
  }

  async function restoreBackup() {
    if (!DESKFORGE || !DESKFORGE.data) return Toast.info('恢复仅在 Deskforge 桌面版可用');
    var result = await DESKFORGE.data.restore();
    if (result.canceled) return;
    Toast.success('备份已恢复，即将刷新');
    setTimeout(function () { location.reload(); }, 500);
  }

  async function openSettingsModal() {
    if (window.parent && window.parent !== window) { window.parent.postMessage({ type: 'deskforge:open-module', module: 'settings' }, '*'); return; }
    var settings = DESKFORGE && DESKFORGE.settings ? await DESKFORGE.settings.get() : { displayName: 'Brandon', role: '产品经理', workspaceName: '个人工作台', compactMode: false, reduceMotion: false };
    var updateState = DESKFORGE && DESKFORGE.updates ? await DESKFORGE.updates.status() : { status: 'disabled', message: '自动更新仅在桌面版可用' };
    var overlay = Modal.open({
      title: 'Deskforge 设置', width: 560,
      body: '<div class="wbi-settings-grid"><div class="wbi-field"><label class="wbi-field__label">显示名称</label><input class="wbi-input" id="wbiDisplayName" maxlength="40" value="' + esc(settings.displayName) + '"></div><div class="wbi-field"><label class="wbi-field__label">角色</label><input class="wbi-input" id="wbiRole" maxlength="40" value="' + esc(settings.role) + '"></div></div><div class="wbi-field"><label class="wbi-field__label">工作区名称</label><input class="wbi-input" id="wbiWorkspace" maxlength="60" value="' + esc(settings.workspaceName) + '"></div><div class="wbi-settings-grid"><div class="wbi-field"><label class="wbi-field__label">最多保留备份数</label><input class="wbi-input" id="wbiBackupCount" type="number" min="1" max="100" value="' + settings.backupRetentionCount + '"></div><div class="wbi-field"><label class="wbi-field__label">最长保留天数</label><input class="wbi-input" id="wbiBackupDays" type="number" min="1" max="3650" value="' + settings.backupRetentionDays + '"></div></div><label class="wbi-check"><input type="checkbox" id="wbiCompact"' + (settings.compactMode ? ' checked' : '') + '> 使用紧凑任务列表</label><label class="wbi-check"><input type="checkbox" id="wbiMotion"' + (settings.reduceMotion ? ' checked' : '') + '> 减少界面动态效果</label><div class="wbi-empty-hint" id="wbiUpdateStatus">更新：' + esc(updateState.message) + '</div><div class="wbi-data-actions"><button class="wbi-btn wbi-btn--ghost" id="wbiUpdate">检查更新</button><button class="wbi-btn wbi-btn--ghost" id="wbiExport">导出 JSON</button><button class="wbi-btn wbi-btn--ghost" id="wbiImport">导入 JSON</button><button class="wbi-btn wbi-btn--ghost" id="wbiBackup">立即备份</button><button class="wbi-btn wbi-btn--ghost" id="wbiRestore">从文件恢复</button><button class="wbi-btn wbi-btn--ghost" id="wbiBackupHistory">备份历史</button><button class="wbi-btn wbi-btn--ghost" id="wbiPruneBackups">清理旧备份</button><button class="wbi-btn wbi-btn--ghost" id="wbiChangePassword">修改密码</button><button class="wbi-btn wbi-btn--ghost" id="wbiPrivacy">隐私政策</button><button class="wbi-btn wbi-btn--ghost" id="wbiTerms">用户协议</button></div>',
      buttons: [{ label: '取消', kind: 'ghost' }, { label: '保存设置', kind: 'primary', onClick: async function () {
        if (!DESKFORGE || !DESKFORGE.settings) return true;
        var saved = await DESKFORGE.settings.save({ displayName: $('#wbiDisplayName', overlay).value, role: $('#wbiRole', overlay).value, workspaceName: $('#wbiWorkspace', overlay).value, compactMode: $('#wbiCompact', overlay).checked, reduceMotion: $('#wbiMotion', overlay).checked, backupRetentionCount: Number($('#wbiBackupCount', overlay).value), backupRetentionDays: Number($('#wbiBackupDays', overlay).value) });
        applySettings(saved); Toast.success('设置已保存'); return true;
      } }],
    });
    $('#wbiExport', overlay).addEventListener('click', exportData);
    $('#wbiImport', overlay).addEventListener('click', importData);
    $('#wbiBackup', overlay).addEventListener('click', createBackup);
    $('#wbiRestore', overlay).addEventListener('click', restoreBackup);
    $('#wbiBackupHistory', overlay).addEventListener('click', openBackupHistoryModal);
    $('#wbiUpdate', overlay).addEventListener('click', async function () {
      if (updateState.status === 'disabled' || updateState.status === 'development') return Toast.info(updateState.message);
      if (updateState.status === 'available') updateState = await DESKFORGE.updates.download();
      else if (updateState.status === 'downloaded') return DESKFORGE.updates.install();
      else updateState = await DESKFORGE.updates.check();
      $('#wbiUpdateStatus', overlay).textContent = '更新：' + updateState.message;
    });
    $('#wbiPruneBackups', overlay).addEventListener('click', async function () { var result = await DESKFORGE.data.pruneBackups(); Toast.success('已清理 ' + result.removed + ' 个旧备份，保留 ' + result.remaining + ' 个'); });
    $('#wbiChangePassword', overlay).addEventListener('click', openChangePasswordModal);
    $('#wbiPrivacy', overlay).addEventListener('click', function () { return DESKFORGE.legal.open('privacy'); });
    $('#wbiTerms', overlay).addEventListener('click', function () { return DESKFORGE.legal.open('terms'); });
  }

  function openChangePasswordModal() {
    var overlay = Modal.open({ title: '修改本地密码', small: true, body: '<div class="wbi-field"><label class="wbi-field__label">当前密码</label><input class="wbi-input" id="wbiCurrentPassword" type="password"></div><div class="wbi-field"><label class="wbi-field__label">新密码</label><input class="wbi-input" id="wbiNewPassword" type="password"><div class="wbi-note__time">至少 8 位，同时包含字母和数字</div></div>', buttons: [{ label: '取消', kind: 'ghost' }, { label: '确认修改', kind: 'primary', onClick: async function () { await DESKFORGE.auth.changePassword({ currentPassword: $('#wbiCurrentPassword', overlay).value, newPassword: $('#wbiNewPassword', overlay).value }); Toast.success('密码已更新'); return true; } }] });
  }

  async function openBackupHistoryModal() {
    var backups = await DESKFORGE.data.listBackups();
    var overlay = Modal.open({ title: '备份历史', width: 650, body: recordListHtml(backups, '还没有本地备份', function (b) { return '<div class="wbi-note" data-backup-id="' + b.id + '"><span class="wbi-note__icon wbi-note__icon--blue">' + icon('archive') + '</span><div class="wbi-note__text"><strong style="color:#eceef1">' + esc(b.filename) + '</strong><div class="wbi-note__time">' + Math.max(1, Math.round(b.size / 1024)) + ' KB · ' + esc(b.kind) + ' · ' + esc(b.createdAt) + '</div></div><button class="wbi-btn wbi-btn--ghost wbi-backup-restore">恢复</button><button class="wbi-btn wbi-btn--danger wbi-backup-remove">删除</button></div>'; }), buttons: [{ label: '关闭', kind: 'ghost' }] });
    overlay.addEventListener('click', async function (e) {
      var row = e.target.closest('[data-backup-id]'); if (!row) return;
      var id = Number(row.dataset.backupId);
      if (e.target.closest('.wbi-backup-restore')) { await DESKFORGE.data.restoreBackup(id); Toast.success('备份已恢复，即将刷新'); setTimeout(function () { location.reload(); }, 500); }
      if (e.target.closest('.wbi-backup-remove')) { await DESKFORGE.data.removeBackup(id); row.remove(); Toast.success('备份已删除'); }
    });
  }

  function recordListHtml(items, emptyText, rowBuilder) {
    return items.length ? items.map(rowBuilder).join('') : '<div class="wbi-empty-hint">' + esc(emptyText) + '</div>';
  }

  async function openProjectsModal() {
    var projects = await DESKFORGE.projects.list();
    var overlay = Modal.open({
      title: '项目总览', width: 620,
      body: '<div id="wbiProjectList">' + recordListHtml(projects, '还没有项目', function (p) { return '<div class="wbi-note" data-project-id="' + p.id + '"><span class="wbi-note__icon wbi-note__icon--green">' + icon('folder') + '</span><div class="wbi-note__text"><strong style="color:#eceef1">' + esc(p.name) + '</strong><div class="wbi-note__time">' + p.doneCount + '/' + p.taskCount + ' 项 · ' + p.progress + '% · ' + esc(p.description || '暂无描述') + '</div></div><button class="wbi-btn wbi-btn--ghost wbi-project-tasks">任务</button><button class="wbi-btn wbi-btn--ghost wbi-project-archive">归档</button></div>'; }) + '</div>',
      buttons: [{ label: '关闭', kind: 'ghost' }, { label: '新建项目', kind: 'primary', icon: 'plus', onClick: function () { setTimeout(openNewProjectModal, 50); return true; } }],
    });
    overlay.addEventListener('click', async function (e) {
      var taskBtn = e.target.closest('.wbi-project-tasks');
      if (taskBtn) { openProjectTasksModal(Number(taskBtn.closest('[data-project-id]').dataset.projectId)); return; }
      var btn = e.target.closest('.wbi-project-archive'); if (!btn) return;
      var row = btn.closest('[data-project-id]'); await DESKFORGE.projects.archive(Number(row.dataset.projectId)); row.remove(); Toast.success('项目已归档');
    });
  }

  async function openProjectTasksModal(projectId) {
    var assigned = await DESKFORGE.projects.tasks(projectId);
    var all = Object.keys(TASK_DETAILS).map(function (code) { return { code: code, name: TASK_DETAILS[code].name }; });
    var options = all.map(function (task) { return '<option value="' + esc(task.code) + '">' + esc(task.code + ' · ' + task.name) + '</option>'; }).join('');
    var overlay = Modal.open({ title: '项目任务', width: 620, body: '<div class="wbi-field"><label class="wbi-field__label">添加任务</label><div style="display:flex;gap:8px"><select class="wbi-select" id="wbiProjectTaskSelect">' + options + '</select><button class="wbi-btn wbi-btn--primary" id="wbiProjectTaskAdd">添加</button></div></div><div id="wbiProjectTasks">' + recordListHtml(assigned, '该项目还没有任务', function (t) { return '<div class="wbi-note" data-task-code="' + esc(t.code) + '"><div class="wbi-note__text"><strong style="color:#eceef1">' + esc(t.name) + '</strong><div class="wbi-note__time">' + esc(t.code) + ' · ' + esc(t.status) + '</div></div><button class="wbi-btn wbi-btn--ghost wbi-project-task-remove">移出</button></div>'; }) + '</div>', buttons: [{ label: '关闭', kind: 'ghost' }] });
    $('#wbiProjectTaskAdd', overlay).addEventListener('click', async function () { await DESKFORGE.projects.assignTask(projectId, $('#wbiProjectTaskSelect', overlay).value); Toast.success('任务已加入项目'); setTimeout(function () { openProjectTasksModal(projectId); }, 50); });
    overlay.addEventListener('click', async function (e) { var btn = e.target.closest('.wbi-project-task-remove'); if (!btn) return; var row = btn.closest('[data-task-code]'); await DESKFORGE.projects.unassignTask(row.dataset.taskCode); row.remove(); Toast.success('任务已移出项目'); });
  }

  function openNewProjectModal() {
    var overlay = Modal.open({ title: '新建项目', small: true, body: '<div class="wbi-field"><label class="wbi-field__label">项目名称 <em>*</em></label><input class="wbi-input" id="wbiProjectName" maxlength="100"></div><div class="wbi-field"><label class="wbi-field__label">项目描述</label><textarea class="wbi-textarea" id="wbiProjectDesc" maxlength="1000"></textarea></div><div class="wbi-field"><label class="wbi-field__label">截止日期</label><input class="wbi-input" id="wbiProjectDeadline" type="date"></div>', buttons: [{ label: '取消', kind: 'ghost' }, { label: '创建', kind: 'primary', onClick: async function () { await DESKFORGE.projects.create({ name: $('#wbiProjectName', overlay).value, description: $('#wbiProjectDesc', overlay).value, deadline: $('#wbiProjectDeadline', overlay).value }); Toast.success('项目已创建'); return true; } }] });
  }

  async function openFilesModal() {
    var files = await DESKFORGE.files.list();
    var overlay = Modal.open({ title: '文件归档', width: 650, body: '<div id="wbiFileList">' + recordListHtml(files, '还没有归档文件', function (f) { return '<div class="wbi-note" data-file-id="' + f.id + '" data-file-path="' + esc(f.path) + '"><span class="wbi-note__icon wbi-note__icon--blue">' + icon('doc') + '</span><div class="wbi-note__text"><strong style="color:#eceef1">' + esc(f.name) + '</strong><div class="wbi-note__time">' + Math.max(1, Math.round(f.size / 1024)) + ' KB · ' + esc(f.path) + '</div></div><button class="wbi-btn wbi-btn--ghost wbi-file-open">打开</button><button class="wbi-btn wbi-btn--danger wbi-file-remove">移除</button></div>'; }) + '</div>', buttons: [{ label: '关闭', kind: 'ghost' }, { label: '添加文件', kind: 'primary', icon: 'plus', onClick: async function () { var result = await DESKFORGE.files.add(); if (!result.canceled) { Toast.success('文件已加入归档'); setTimeout(openFilesModal, 50); } return true; } }] });
    overlay.addEventListener('click', async function (e) {
      var row = e.target.closest('[data-file-id]'); if (!row) return;
      if (e.target.closest('.wbi-file-open')) await DESKFORGE.files.open(row.dataset.filePath);
      if (e.target.closest('.wbi-file-remove')) { await DESKFORGE.files.remove(Number(row.dataset.fileId)); row.remove(); Toast.success('已移除归档记录，原文件未删除'); }
    });
  }

  async function openScheduleModal() {
    var tasks = Object.keys(TASK_DETAILS).map(function (id) { return { id: id, name: TASK_DETAILS[id].name, deadline: TASK_DETAILS[id].deadline }; }).filter(function (t) { return t.deadline; }).sort(function (a, b) { return a.deadline.localeCompare(b.deadline); });
    var reminders = DESKFORGE.reminders ? await DESKFORGE.reminders.list() : [];
    var overlay = Modal.open({ title: '日程与提醒', width: 650, body: '<div class="wbi-field"><label class="wbi-field__label">本地提醒</label>' + recordListHtml(reminders, '暂无提醒', function (r) { return '<div class="wbi-note" data-reminder-id="' + r.id + '"><span class="wbi-note__icon wbi-note__icon--green">' + icon('bell') + '</span><div class="wbi-note__text"><strong style="color:#eceef1">' + esc(r.title) + '</strong><div class="wbi-note__time">' + esc(new Date(r.remindAt).toLocaleString()) + ' · ' + esc(r.repeatRule) + ' · ' + esc(r.status) + '</div></div><button class="wbi-btn wbi-btn--danger wbi-reminder-remove">删除</button></div>'; }) + '</div><div class="wbi-field"><label class="wbi-field__label">任务截止日期</label>' + recordListHtml(tasks, '暂无设置截止日期的任务', function (t) { return '<div class="wbi-note"><div class="wbi-note__text"><strong style="color:#eceef1">' + esc(t.name) + '</strong><div class="wbi-note__time">' + esc(t.id) + ' · ' + esc(t.deadline) + '</div></div></div>'; }) + '</div>', buttons: [{ label: '关闭', kind: 'ghost' }, { label: '新建提醒', kind: 'primary', onClick: function () { setTimeout(openNewReminderModal, 50); return true; } }] });
    overlay.addEventListener('click', async function (e) { var btn = e.target.closest('.wbi-reminder-remove'); if (!btn) return; var row = btn.closest('[data-reminder-id]'); await DESKFORGE.reminders.remove(Number(row.dataset.reminderId)); row.remove(); Toast.success('提醒已删除'); });
  }

  function openNewReminderModal() {
    var overlay = Modal.open({ title: '新建本地提醒', small: true, body: '<div class="wbi-field"><label class="wbi-field__label">标题</label><input class="wbi-input" id="wbiReminderTitle" maxlength="120"></div><div class="wbi-field"><label class="wbi-field__label">提醒时间</label><input class="wbi-input" id="wbiReminderAt" type="datetime-local"></div><div class="wbi-field"><label class="wbi-field__label">重复</label><select class="wbi-select" id="wbiReminderRepeat"><option value="none">不重复</option><option value="daily">每天</option><option value="weekly">每周</option></select></div>', buttons: [{ label: '取消', kind: 'ghost' }, { label: '创建', kind: 'primary', onClick: async function () { await DESKFORGE.reminders.create({ title: $('#wbiReminderTitle', overlay).value, remindAt: $('#wbiReminderAt', overlay).value, repeatRule: $('#wbiReminderRepeat', overlay).value }); Toast.success('本地提醒已创建'); return true; } }] });
  }

  function applyWorkbenchSummary(data) {
    var ws = $('#wbWsItem'); if (ws) ws.childNodes.forEach(function (node) { if (node.nodeType === 3 && node.textContent.trim()) node.textContent = '\n        ' + data.workspace.name + '\n        '; });
    var values = { '今日待办': data.stats.total - data.stats.done, '进行中': data.stats.doing, '已完成': data.stats.done, '逾期任务': data.stats.overdue };
    $$('.wb-stat').forEach(function (card) { var label = $('.wb-stat__label', card); var num = $('.wb-stat__num', card); if (label && num && values[label.textContent.trim()] != null) num.textContent = values[label.textContent.trim()]; });
  }

  function refreshWorkbenchSummary() {
    if (DESKFORGE && DESKFORGE.workbench) DESKFORGE.workbench.dashboard().then(applyWorkbenchSummary).catch(function () {});
  }

  function bindWorkbenchNavigation() {
    function reactModule(name) { return function () { window.parent.postMessage({ type: 'deskforge:open-module', module: name }, '*'); }; }
    var actions = {
      '任务管理': reactModule('tasks'),
      '项目总览': reactModule('projects'),
      '文件归档': reactModule('files'),
      '日程管理': reactModule('reminders'),
      '团队协作': reactModule('team'),
      '智能分析': reactModule('analysis'),
      '知识库': reactModule('files'),
      '设置中心': reactModule('settings'),
    };
    $$('.wb-nav__item').forEach(function (item) {
      var label = item.textContent.trim().replace(/\s+/g, ' ');
      Object.keys(actions).some(function (key) {
        if (label.indexOf(key) === -1) return false;
        item.addEventListener('click', actions[key]); return true;
      });
    });
    var addWorkspace = $('.wb-ws__add'); if (addWorkspace) addWorkspace.addEventListener('click', reactModule('workspaces'));
    var workspace = $('#wbWsItem'); if (workspace) workspace.addEventListener('click', reactModule('workspaces'));
    window.addEventListener('message', function (event) { if (event.data && event.data.type === 'deskforge:refresh-summary') refreshWorkbenchSummary(); });
  }

  async function openGlobalSearch(query) {
    window.parent.postMessage({ type: 'deskforge:open-module', module: 'search', payload: { query: query } }, '*');
  }

  /* ================================================================
     6. 初始化：为既有 DOM 补充数据属性
     ================================================================ */
  function augmentExistingRows() {
    $$('.wb-task').forEach(function (row) {
      var id = row.getAttribute('data-task');
      row.dataset.status = row.querySelector('.wb-task__status') ? 'doing' : 'todo';
      var own = OWNERS[id] || { owner: 'brandon', part: true };
      row.dataset.owner = own.owner;
      row.dataset.part = own.part ? '1' : '0';
    });
  }

  function getGroups() { return $$('.wb-group'); }

  function getSelectedRow() { return $('.wb-task--selected'); }

  function updateGroupCount(groupEl) {
    var count = $$('.wb-task', groupEl).length;
    var countEl = $('.wb-group__count', groupEl);
    if (countEl) countEl.textContent = count;
  }

  /* ================================================================
     7. 四重过滤：标签页 + 状态 + 快捷筛选 + 搜索
     ================================================================ */
  var emptyHint = null;

  function applyFilters() {
    var q = state.search.trim().toLowerCase();
    var anyVisible = false;

    getGroups().forEach(function (group) {
      var visible = 0;
      $$('.wb-task', group).forEach(function (row) {
        var ok = true;
        var text = row.textContent.toLowerCase();
        var status = row.dataset.status || 'todo';
        var owner = row.dataset.owner;
        var part = row.dataset.part === '1';

        if (state.tab === 'mine' && owner !== 'brandon') ok = false;
        if (state.tab === 'joined' && !part) ok = false;
        if (state.status !== 'all' && status !== state.status) ok = false;
        if (state.quick === 'today' && text.indexOf('今天') === -1) ok = false;
        if (state.quick === 'high' && !row.querySelector('.wb-badge--high')) ok = false;
        if (q && text.indexOf(q) === -1) ok = false;

        row.style.display = ok ? '' : 'none';
        if (ok) visible++;
      });
      group.style.display = visible ? '' : 'none';
      if (visible) anyVisible = true;
    });

    if (!emptyHint) {
      emptyHint = createEl('<div class="wbi-empty-hint wbi-hidden">没有匹配的任务，试试调整筛选条件</div>');
      var groups = $('.wb-groups');
      if (groups) groups.appendChild(emptyHint);
    }
    emptyHint.classList.toggle('wbi-hidden', anyVisible);
    queueSave();
  }

  function bindFilterSources() {
    // 标签页（原页面已处理激活态，这里补充过滤逻辑）
    var tabs = $('#wbTabs');
    if (tabs) {
      tabs.addEventListener('click', function (e) {
        var tab = e.target.closest('.wb-tabs__tab');
        if (!tab) return;
        var label = tab.textContent.trim();
        state.tab = label === '我负责的' ? 'mine' : label === '我参与的' ? 'joined' : 'all';
        applyFilters();
      });
    }

    // 搜索
    var searchInput = $('#wbSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.search = this.value;
        applyFilters();
      });
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && this.value.trim() && DESKFORGE && DESKFORGE.workbench) {
          openGlobalSearch(this.value.trim());
          e.preventDefault();
          return;
        }
        if (e.key === 'Escape' && this.value) {
          this.value = '';
          state.search = '';
          applyFilters();
          e.stopPropagation();
        }
      });
    }
  }

  /* ================================================================
     8. 看板工具：状态筛选 / 排序 / 快捷筛选 / 视图切换
     ================================================================ */
  function findToolBtn(text) {
    var btn = null;
    $$('.wb-kanban__head .wb-toolbtn, .wb-gantt__tools .wb-toolbtn').some(function (b) {
      if (b.textContent.trim().indexOf(text) > -1) { btn = b; return true; }
      return false;
    });
    return btn;
  }

  function bindKanbanTools() {
    // 状态筛选
    var statusBtn = findToolBtn('状态');
    if (statusBtn) {
      statusBtn.addEventListener('click', function () {
        var self = this;
        var opts = [
          { key: 'all',  label: '全部状态' },
          { key: 'todo', label: '待开始' },
          { key: 'doing', label: '进行中' },
          { key: 'done', label: '已完成' },
        ].map(function (o) {
          return {
            label: o.label,
            active: state.status === o.key,
            onClick: function () {
              state.status = o.key;
              self.classList.toggle('wb-toolbtn--on', o.key !== 'all');
              applyFilters();
            },
          };
        });
        Dropdown.open(self, opts, { align: 'left' });
      });
    }

    // 快捷筛选
    var filterBtn = findToolBtn('筛选');
    if (filterBtn) {
      filterBtn.addEventListener('click', function () {
        var self = this;
        Dropdown.open(self, [
          { label: '只看今天的任务', active: state.quick === 'today',
            onClick: function () { setQuick(self, state.quick === 'today' ? null : 'today'); } },
          { label: '只看高优先级', active: state.quick === 'high',
            onClick: function () { setQuick(self, state.quick === 'high' ? null : 'high'); } },
          { divider: true },
          { label: '清除筛选条件', icon: 'x',
            onClick: function () { setQuick(self, null); } },
        ], { align: 'right' });
      });
    }

    // 排序
    var sortBtn = findToolBtn('排序');
    if (sortBtn) {
      sortBtn.addEventListener('click', function () {
        var self = this;
        var opts = [
          { key: 'default',  label: '默认排序' },
          { key: 'priority', label: '按优先级（高 → 低）' },
          { key: 'id',       label: '按任务编号' },
          { key: 'name',     label: '按任务名称' },
        ].map(function (o) {
          return {
            label: o.label,
            active: state.sort === o.key,
            onClick: function () {
              state.sort = o.key;
              self.classList.toggle('wb-toolbtn--on', o.key !== 'default');
              sortTasks();
            },
          };
        });
        Dropdown.open(self, opts, { align: 'right' });
      });
    }

    // 紧凑视图切换
    var viewBtn = $('.wb-toolbtn--icon[title="列表视图"]');
    if (viewBtn) {
      viewBtn.addEventListener('click', function () {
        var groups = $('.wb-groups');
        groups.classList.toggle('wbi-compact');
        this.classList.toggle('wb-toolbtn--on', groups.classList.contains('wbi-compact'));
      });
    }
  }

  function setQuick(btn, val) {
    state.quick = val;
    btn.classList.toggle('wb-toolbtn--on', !!val);
    applyFilters();
  }

  function sortTasks() {
    var PRIORITY = { '高': 3, '中': 2, '低': 1 };
    getGroups().forEach(function (group) {
      var list = $('.wb-group__list', group);
      if (!list) return;
      var rows = $$('.wb-task', list);
      if (state.sort === 'default') {
        rows.sort(function (a, b) { return a.getAttribute('data-task').localeCompare(b.getAttribute('data-task')); });
      } else if (state.sort === 'priority') {
        rows.sort(function (a, b) {
          var pa = PRIORITY[($('.wb-badge', a) || {}).textContent] || 0;
          var pb = PRIORITY[($('.wb-badge', b) || {}).textContent] || 0;
          return pb - pa;
        });
      } else if (state.sort === 'name') {
        rows.sort(function (a, b) {
          return $('.wb-task__name', a).textContent.localeCompare($('.wb-task__name', b).textContent, 'zh');
        });
      } else {
        rows.sort(function (a, b) { return a.getAttribute('data-task').localeCompare(b.getAttribute('data-task')); });
      }
      rows.forEach(function (r) { list.appendChild(r); });
    });
    if (state.sort !== 'default') Toast.info('已按' + ({ priority: '优先级', id: '任务编号', name: '任务名称' }[state.sort] || '默认') + '排序');
  }

  /* ================================================================
     9. 统计数字联动（滚动动画）
     ================================================================ */
  function bumpStat(label, delta) {
    var card = null;
    $$('.wb-stat').some(function (c) {
      var l = $('.wb-stat__label', c);
      if (l && l.textContent.trim() === label) { card = c; return true; }
      return false;
    });
    if (!card) return;
    var numEl = $('.wb-stat__num', card);
    var from = parseInt(numEl.textContent, 10) || 0;
    var to = Math.max(0, from + delta);
    var start = null;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / 420);
      var eased = 1 - Math.pow(1 - p, 3);
      numEl.textContent = Math.round(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ================================================================
     10. 任务操作：新增 / 编辑 / 完成 / 删除 / 归档
     ================================================================ */
  var BADGE_CLS = { '高': 'wb-badge--high', '中': 'wb-badge--mid', '低': 'wb-badge--low' };

  function buildTaskRow(id, name, priority, timeText) {
    var row = createEl(
      '<div class="wb-task" data-task="' + esc(id) + '">' +
        '<span class="wb-task__id">' + esc(id) + '</span>' +
        '<span class="wb-task__name">' + esc(name) + '</span>' +
        '<span class="wb-badge ' + BADGE_CLS[priority] + '">' + esc(priority) + '</span>' +
        '<span class="wb-task__time">' + esc(timeText) + '</span>' +
      '</div>'
    );
    row.dataset.status = 'todo';
    row.dataset.owner = 'brandon';
    row.dataset.part = '1';
    return row;
  }

  function deadlineToText(deadline) {
    if (!deadline) return '待定';
    var normalized = deadline.replace(' ', 'T');
    return formatDeadline(normalized.slice(0, 10), normalized.slice(11, 16));
  }

  function buildTaskRowFromRecord(task) {
    var statusText = task.status === 'done' ? '已完成' : task.status === 'doing' ? '进行中' : null;
    var row = buildTaskRow(task.id, task.name, task.priority, deadlineToText(task.deadline));
    row.dataset.status = task.status;
    row.dataset.owner = task.owner;
    row.dataset.part = task.participant ? '1' : '0';
    if (statusText) {
      var tail = $('.wb-task__time', row);
      if (tail) tail.replaceWith(createEl('<span class="wb-task__status">' + statusText + '</span>'));
    }
    if (task.status === 'done') row.classList.add('wb-task--done');

    TASK_DETAILS[task.id] = {
      name: task.name,
      prio: task.priority + '优先级',
      desc: task.description || '暂无任务描述。',
      deadline: task.deadline || '待定',
      status: statusText || '待开始',
      priority: task.priority,
      groupId: task.groupId,
    };
    OWNERS[task.id] = { owner: task.owner, part: task.participant };
    return row;
  }

  function groupOptionsHtml() {
    return getGroups().map(function (group, index) {
      var id = group.dataset.groupId || index;
      return '<option value="' + esc(id) + '">' + esc($('.wb-group__name', group).textContent.trim()) + '</option>';
    }).join('');
  }

  function formatDeadline(dateStr, timeStr) {
    if (!dateStr) return '待定';
    var d = new Date(dateStr + (timeStr ? 'T' + timeStr : 'T18:00'));
    if (isNaN(d)) return '待定';
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var diff = Math.round((target - today) / 86400000);
    var hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    if (diff === 0) return '今天 ' + hm;
    if (diff === 1) return '明天 ' + hm;
    return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + hm;
  }

  /* ── 新增任务弹窗 ── */
  function openNewTaskModal() {
    var overlay = Modal.open({
      title: '新增任务',
      body:
        '<div class="wbi-field">' +
          '<label class="wbi-field__label">任务名称 <em>*</em></label>' +
          '<input class="wbi-input" id="wbiNtName" placeholder="输入任务名称" maxlength="30">' +
        '</div>' +
        '<div class="wbi-row">' +
          '<div class="wbi-field">' +
            '<label class="wbi-field__label">所属分组</label>' +
            '<select class="wbi-select" id="wbiNtGroup">' +
              groupOptionsHtml() +
            '</select>' +
          '</div>' +
          '<div class="wbi-field">' +
            '<label class="wbi-field__label">截止时间</label>' +
            '<input class="wbi-input" id="wbiNtDeadline" type="datetime-local">' +
          '</div>' +
        '</div>' +
        '<div class="wbi-field">' +
          '<label class="wbi-field__label">优先级</label>' +
          '<div class="wbi-seg" id="wbiNtPrio">' +
            '<button class="wbi-seg__btn wbi-seg__btn--high" data-v="高">高</button>' +
            '<button class="wbi-seg__btn wbi-seg__btn--mid wbi-seg__btn--on" data-v="中">中</button>' +
            '<button class="wbi-seg__btn" data-v="低">低</button>' +
          '</div>' +
        '</div>' +
        '<div class="wbi-field">' +
          '<label class="wbi-field__label">任务描述</label>' +
          '<textarea class="wbi-textarea" id="wbiNtDesc" placeholder="补充任务背景、目标与验收标准..."></textarea>' +
        '</div>',
      footer: true,
      buttons: [
        { label: '取消', kind: 'ghost' },
        { label: '创建任务', kind: 'primary', icon: 'plus', onClick: async function () {
          var nameInput = $('#wbiNtName');
          var name = nameInput.value.trim();
          if (!name) {
            nameInput.classList.add('wbi-input--error');
            setTimeout(function () { nameInput.classList.remove('wbi-input--error'); }, 600);
            nameInput.focus();
            return false;
          }
          var selectedGroup = $('#wbiNtGroup').value;
          var prio = $('.wbi-seg__btn--on', $('#wbiNtPrio')).getAttribute('data-v');
          var deadlineRaw = $('#wbiNtDeadline').value; // 2025-05-24T18:00
          var desc = $('#wbiNtDesc').value.trim();

          var timeText = deadlineRaw
            ? formatDeadline(deadlineRaw.slice(0, 10), deadlineRaw.slice(11))
            : '待定';

          var task;
          if (hasTaskBackend()) {
            task = await DESKFORGE.tasks.create({
              groupId: Number(selectedGroup),
              name: name,
              description: desc,
              priority: prio,
              status: 'todo',
              deadline: deadlineRaw ? deadlineRaw.replace('T', ' ') : null,
              owner: 'brandon',
              participant: true,
            });
          } else {
            var fallbackId = 'WXB-2025-' + String(taskSeq++).padStart(3, '0');
            task = {
              id: fallbackId, groupId: Number(selectedGroup), name: name, description: desc,
              priority: prio, status: 'todo', deadline: deadlineRaw ? deadlineRaw.replace('T', ' ') : null,
              owner: 'brandon', participant: true,
            };
          }

          var group = hasTaskBackend()
            ? $('.wb-group[data-group-id="' + task.groupId + '"]')
            : (getGroups()[Number(selectedGroup)] || getGroups()[0]);
          var list = $('.wb-group__list', group);
          var row = hasTaskBackend() ? buildTaskRowFromRecord(task) : buildTaskRow(task.id, name, prio, timeText);
          list.appendChild(row);
          group.classList.remove('wb-group--closed');
          updateGroupCount(group);

          TASK_DETAILS[task.id] = {
            name: name, prio: prio + '优先级',
            desc: desc || '暂无任务描述。',
            deadline: deadlineRaw ? deadlineRaw.replace('T', ' ') : '待定',
            status: '待开始', priority: prio, groupId: task.groupId,
          };
          OWNERS[task.id] = { owner: task.owner, part: task.participant };

          if (timeText.indexOf('今天') > -1) bumpStat('今日待办', 1);
          refreshWorkbenchSummary();
          applyFilters();
          row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          selectTaskRow(row);
          Toast.success('任务「' + name + '」已创建');
          return true;
        } },
      ],
    });

    // 分段选择器
    $('#wbiNtPrio', overlay).addEventListener('click', function (e) {
      var btn = e.target.closest('.wbi-seg__btn');
      if (!btn) return;
      $$('.wbi-seg__btn', this).forEach(function (b) { b.classList.remove('wbi-seg__btn--on'); });
      btn.classList.add('wbi-seg__btn--on');
    });
  }

  /* ── 编辑任务弹窗 ── */
  function openEditTaskModal() {
    var row = getSelectedRow();
    if (!row) { Toast.info('请先在看板中选择一个任务'); return; }
    var id = row.getAttribute('data-task');
    var detail = TASK_DETAILS[id] || {};

    var overlay = Modal.open({
      title: '编辑任务',
      body:
        '<div class="wbi-field">' +
          '<label class="wbi-field__label">任务编号</label>' +
          '<input class="wbi-input" value="' + esc(id) + '" disabled style="opacity:.5">' +
        '</div>' +
        '<div class="wbi-field">' +
          '<label class="wbi-field__label">任务名称 <em>*</em></label>' +
          '<input class="wbi-input" id="wbiEtName" value="' + esc(detail.name || '') + '" maxlength="30">' +
        '</div>' +
        '<div class="wbi-field">' +
          '<label class="wbi-field__label">优先级</label>' +
          '<div class="wbi-seg" id="wbiEtPrio">' +
            ['高', '中', '低'].map(function (p) {
              var on = detail.priority === p ? ' wbi-seg__btn--on' : '';
              var cls = p === '高' ? 'wbi-seg__btn--high' : p === '中' ? 'wbi-seg__btn--mid' : '';
              return '<button class="wbi-seg__btn ' + cls + on + '" data-v="' + p + '">' + p + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="wbi-field">' +
          '<label class="wbi-field__label">截止时间</label>' +
          '<input class="wbi-input" id="wbiEtDeadline" value="' + esc(detail.deadline || '') + '">' +
        '</div>' +
        '<div class="wbi-field">' +
          '<label class="wbi-field__label">任务描述</label>' +
          '<textarea class="wbi-textarea" id="wbiEtDesc">' + esc(detail.desc || '') + '</textarea>' +
        '</div>',
      footer: true,
      buttons: [
        { label: '取消', kind: 'ghost' },
        { label: '保存修改', kind: 'primary', icon: 'check', onClick: async function () {
          var nameInput = $('#wbiEtName');
          var name = nameInput.value.trim();
          if (!name) {
            nameInput.classList.add('wbi-input--error');
            setTimeout(function () { nameInput.classList.remove('wbi-input--error'); }, 600);
            return false;
          }
          var prio = $('.wbi-seg__btn--on', $('#wbiEtPrio')).getAttribute('data-v');
          var deadline = $('#wbiEtDeadline').value.trim();
          var desc = $('#wbiEtDesc').value.trim();

          var updated = null;
          if (hasTaskBackend()) {
            updated = await DESKFORGE.tasks.update(id, {
              groupId: detail.groupId,
              name: name,
              priority: prio,
              deadline: deadline === '待定' ? null : deadline,
              description: desc,
            });
          }

          // 更新看板行
          $('.wb-task__name', row).textContent = updated ? updated.name : name;
          var badge = $('.wb-badge', row);
          badge.textContent = updated ? updated.priority : prio;
          badge.className = 'wb-badge ' + BADGE_CLS[updated ? updated.priority : prio];

          // 更新数据与详情面板
          TASK_DETAILS[id] = Object.assign(detail, {
            name: name, prio: prio + '优先级', priority: prio,
            deadline: updated ? (updated.deadline || '待定') : (deadline || detail.deadline),
            desc: updated ? (updated.description || '暂无任务描述。') : (desc || detail.desc),
            groupId: updated ? updated.groupId : detail.groupId,
          });
          syncDetailPanel(id);
          Toast.success('任务已保存');
          return true;
        } },
      ],
    });

    $('#wbiEtPrio', overlay).addEventListener('click', function (e) {
      var btn = e.target.closest('.wbi-seg__btn');
      if (!btn) return;
      $$('.wbi-seg__btn', this).forEach(function (b) { b.classList.remove('wbi-seg__btn--on'); });
      btn.classList.add('wbi-seg__btn--on');
    });
  }

  /* ── 完成任务确认 ── */
  function openCompleteTaskModal() {
    var row = getSelectedRow();
    if (!row) { Toast.info('请先在看板中选择一个任务'); return; }
    if (row.dataset.status === 'done') { Toast.info('该任务已完成'); return; }

    var id = row.getAttribute('data-task');
    var name = $('.wb-task__name', row).textContent;

    Modal.open({
      title: '完成任务',
      small: true,
      body: '<p class="wbi-confirm-text">确认将任务 <strong>' + esc(name) + '</strong>（' + esc(id) + '）标记为已完成吗？</p>',
      footer: true,
      buttons: [
        { label: '取消', kind: 'ghost' },
        { label: '确认完成', kind: 'primary', icon: 'check', onClick: async function () {
          await completeTaskRow(row);
          Toast.success('任务「' + name + '」已完成');
        } },
      ],
    });
  }

  async function completeTaskRow(row) {
    var id = row.getAttribute('data-task');
    var wasTodo = row.dataset.status === 'todo';

    if (hasTaskBackend()) await DESKFORGE.tasks.complete(id);

    row.dataset.status = 'done';
    row.classList.add('wb-task--done');
    var tail = row.querySelector('.wb-task__time') || row.querySelector('.wb-task__status');
    if (tail) {
      var done = createEl('<span class="wb-task__status">已完成</span>');
      tail.replaceWith(done);
    }
    if (TASK_DETAILS[id]) TASK_DETAILS[id].status = '已完成';

    bumpStat('已完成', 1);
    if (wasTodo) bumpStat('今日待办', -1);
    refreshWorkbenchSummary();

    var statusEl = $('#detailStatus');
    if (statusEl) statusEl.textContent = '已完成';
    applyFilters();
  }

  /* ── 删除任务确认 ── */
  function openDeleteTaskModal() {
    var row = getSelectedRow();
    if (!row) { Toast.info('请先在看板中选择一个任务'); return; }
    var id = row.getAttribute('data-task');
    var name = $('.wb-task__name', row).textContent;

    Modal.open({
      title: '删除任务',
      small: true,
      body:
        '<p class="wbi-confirm-text">确认删除任务 <strong>' + esc(name) + '</strong>（' + esc(id) + '）吗？</p>' +
        '<div class="wbi-danger-tip">' + icon('alert') + '<span>删除后任务将从看板与统计中移除，此操作不可撤销。</span></div>',
      footer: true,
      buttons: [
        { label: '取消', kind: 'ghost' },
        { label: '确认删除', kind: 'danger', icon: 'trash', onClick: async function () {
          if (hasTaskBackend()) await DESKFORGE.tasks.remove(id);
          var group = row.closest('.wb-group');
          var next = row.nextElementSibling || row.previousElementSibling;
          var wasDone = row.dataset.status === 'done';
          row.remove();
          if (group) updateGroupCount(group);
          delete TASK_DETAILS[id];
          delete OWNERS[id];
          if (wasDone) bumpStat('已完成', -1);
          else bumpStat(row && row.dataset.status === 'todo' ? '今日待办' : '进行中', 0); // 仅触发刷新动画
          refreshWorkbenchSummary();
          if (next && next.classList.contains('wb-task')) selectTaskRow(next);
          else {
            var first = $('.wb-task');
            if (first) selectTaskRow(first);
          }
          applyFilters();
          Toast.success('任务已删除');
        } },
      ],
    });
  }

  /* ── 归档任务 ── */
  async function archiveSelectedTask() {
    var row = getSelectedRow();
    if (!row) { Toast.info('请先选择一个任务'); return; }
    var id = row.getAttribute('data-task');
    var name = $('.wb-task__name', row).textContent;
    if (hasTaskBackend()) await DESKFORGE.tasks.archive(id);
    var group = row.closest('.wb-group');
    var next = row.nextElementSibling || row.previousElementSibling;
    row.remove();
    if (group) updateGroupCount(group);
    delete TASK_DETAILS[id];
    delete OWNERS[id];
    if (next && next.classList.contains('wb-task')) selectTaskRow(next);
    else if ($('.wb-task')) selectTaskRow($('.wb-task'));
    applyFilters();
    Toast.success('任务「' + name + '」已移入文件归档');
  }

  /* ── 详情面板同步 ── */
  function syncDetailPanel(id) {
    var d = TASK_DETAILS[id];
    if (!d) return;
    var set = function (sel, val) { var el = $(sel); if (el) el.textContent = val; };
    set('#detailId', id);
    set('#detailName', d.name);
    set('#detailPrio', d.prio);
    set('#detailDesc', d.desc);
    set('#detailStatus', d.status);
    set('#detailPriority', d.priority);
    var deadline = $('#detailDeadline');
    if (deadline) {
      deadline.innerHTML = deadline.innerHTML.replace(/<svg[\s\S]*?<\/svg>/, function (m) { return m; });
      deadline.childNodes.forEach(function (n) { if (n.nodeType === 3) n.remove(); });
      deadline.appendChild(document.createTextNode(' ' + d.deadline));
    }
  }

  /* ── 任务行选中（委托，兼容动态新增行） ── */
  function selectTaskRow(row) {
    $$('.wb-task').forEach(function (el) { el.classList.remove('wb-task--selected'); });
    row.classList.add('wb-task--selected');
    var id = row.getAttribute('data-task');
    if (TASK_DETAILS[id]) syncDetailPanel(id);
    if (DESKFORGE && DESKFORGE.tags) {
      DESKFORGE.tags.list(id).then(function (tags) {
        var container = $('.wb-tags'); var add = container && $('.wb-tag--add', container); if (!container || !add) return;
        $$('.wb-tag:not(.wb-tag--add)', container).forEach(function (tag) { tag.remove(); });
        tags.forEach(function (tag) { container.insertBefore(createEl('<span class="wb-tag">' + esc(tag.name) + '</span>'), add); });
      }).catch(function () {});
    }
  }

  function bindTaskDelegation() {
    document.addEventListener('click', function (e) {
      var groupHead = e.target.closest('.wb-group__head');
      if (groupHead) {
        groupHead.closest('.wb-group').classList.toggle('wb-group--closed');
        return;
      }
      var row = e.target.closest('.wb-task');
      if (!row) return;
      // 原页面内联脚本也会处理（幂等），此处确保动态行与详情同步
      selectTaskRow(row);
      if (window.innerWidth <= 1200) {
        var detail = $('#wbDetail');
        if (detail && !detail.classList.contains('wb-detail--open')) {
          detail.classList.add('wb-detail--open');
          $('#wbScrim') && $('#wbScrim').classList.add('wb-scrim--show');
        }
      }
    });
  }

  /* ================================================================
     11. 头部与面板按钮：新增任务 / 编辑 / 完成 / 更多 / AI 建议
     ================================================================ */
  function bindActionButtons() {
    // 新增任务
    var newBtn = $('.wb-btn-new');
    if (newBtn) newBtn.addEventListener('click', openNewTaskModal);

    // 新增旁的分裂按钮
    var splitBtn = $('.wb-btn-split');
    if (splitBtn) {
      splitBtn.addEventListener('click', function () {
        Dropdown.open(this, [
          { label: '新建任务', icon: 'plus', onClick: openNewTaskModal },
          { label: '新建分组', icon: 'folder', onClick: openNewGroupModal },
          { divider: true },
          { label: '导入数据（.json）', icon: 'import', onClick: importData },
          { label: '导出数据（.json）', icon: 'archive', onClick: exportData },
        ], { align: 'right', width: 190 });
      });
    }

    // 编辑任务
    var editBtn = $('.wb-detail__footer .wb-btn--ghost');
    if (editBtn) editBtn.addEventListener('click', openEditTaskModal);

    // 完成任务
    var doneBtn = $('.wb-btn--done');
    if (doneBtn) doneBtn.addEventListener('click', openCompleteTaskModal);

    // 更多操作（详情面板底部，向上弹出避免超出页面）
    var moreBtn = $('.wb-btn--more');
    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        Dropdown.open(this, [
          { label: '复制任务链接', icon: 'link', onClick: function () {
            var row = getSelectedRow();
            var id = row ? row.getAttribute('data-task') : '';
            var text = location.href.split('#')[0] + '#task=' + id;
            if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
            Toast.success('任务链接已复制');
          } },
          { label: '归档任务', icon: 'archive', onClick: archiveSelectedTask },
          { divider: true },
          { label: '删除任务', icon: 'trash', danger: true, onClick: openDeleteTaskModal },
        ], { align: 'right', width: 180, placement: 'top' });
      });
    }

    // AI 建议详情
    var aiBtn = $('.wb-ai__btn');
    if (aiBtn) aiBtn.addEventListener('click', openAiModal);
  }

  /* ── 新建分组弹窗 ── */
  function openNewGroupModal() {
    var DOTS = ['blue', 'green', 'violet'];
    Modal.open({
      title: '新建任务分组',
      small: true,
      body:
        '<div class="wbi-field">' +
          '<label class="wbi-field__label">分组名称 <em>*</em></label>' +
          '<input class="wbi-input" id="wbiNgName" placeholder="例如：测试验收" maxlength="12">' +
        '</div>',
      footer: true,
      buttons: [
        { label: '取消', kind: 'ghost' },
        { label: '创建分组', kind: 'primary', icon: 'plus', onClick: async function () {
          var input = $('#wbiNgName');
          var name = input.value.trim();
          if (!name) {
            input.classList.add('wbi-input--error');
            setTimeout(function () { input.classList.remove('wbi-input--error'); }, 600);
            return false;
          }
          var dot = DOTS[getGroups().length % DOTS.length];
          var createdGroup = hasTaskBackend()
            ? await DESKFORGE.groups.create({ name: name, color: dot })
            : { id: getGroups().length, name: name, color: dot };
          var group = createEl(
            '<div class="wb-group" data-group-id="' + createdGroup.id + '">' +
              '<button class="wb-group__head">' +
                '<span class="wb-group__dot wb-group__dot--' + dot + '"></span>' +
                '<span class="wb-group__name">' + esc(name) + '</span>' +
                '<span class="wb-group__count">0</span>' +
                '<svg class="wb-group__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
              '</button>' +
              '<div class="wb-group__list"></div>' +
            '</div>'
          );
          $('.wb-groups').appendChild(group);
          Toast.success('分组「' + name + '」已创建');
          return true;
        } },
      ],
    });
  }

  /* ── AI 建议详情弹窗 ── */
  function openAiModal() {
    Modal.open({
      title: 'AI 助手建议',
      body:
        '<div class="wbi-empty-hint">AI 建议功能正在开发中</div>',
      footer: true,
      buttons: [
        { label: '关闭', kind: 'ghost' },
      ],
    });
  }

  /* ================================================================
     12. 通知 / 消息 / 用户菜单 / 添加标签
     ================================================================ */
  function bindHeaderPanels() {
    // 通知
    var bellBtn = $('.wb-iconbtn[title="通知"]');
    if (bellBtn) {
      bellBtn.addEventListener('click', async function () {
        if (window.parent && window.parent !== window) { window.parent.postMessage({ type: 'deskforge:open-module', module: 'notifications' }, '*'); return; }
        var notifications = await DESKFORGE.notifications.list();
        var panel = createEl('<div style="width:320px;"><div class="wbi-drop__head"><span>通知中心</span><button id="wbiReadAll">全部已读</button></div>' + recordListHtml(notifications, '暂无通知', function (n) { return '<div class="wbi-note"><span class="wbi-note__icon ' + (n.type === 'warning' ? 'wbi-note__icon--red' : 'wbi-note__icon--blue') + '">' + icon(n.type === 'warning' ? 'alert' : 'check') + '</span><div class="wbi-note__text"><strong style="color:#eceef1">' + esc(n.title) + '</strong><div class="wbi-note__time">' + esc(n.message) + '</div></div>' + (n.isRead ? '' : '<span class="wbi-note__unread"></span>') + '</div>'; }) + '</div>');
        $('#wbiReadAll', panel).addEventListener('click', async function () {
          await DESKFORGE.notifications.readAll(); $$('.wbi-note__unread', panel).forEach(function (d) { d.remove(); });
          var dot = $('.wb-iconbtn__dot', bellBtn);
          if (dot) dot.remove();
          Toast.success('所有通知已标记为已读');
          Dropdown.close();
        });
        Dropdown.open(this, panel, { align: 'right' });
      });
    }

    // 消息
    var mailBtn = $('.wb-iconbtn[title="消息"]');
    if (mailBtn) {
      mailBtn.addEventListener('click', function () {
        var panel = createEl('<div style="width:300px;"><div class="wbi-drop__head"><span>消息</span></div><div class="wbi-empty-hint">消息功能正在开发中</div></div>');
        Dropdown.open(this, panel, { align: 'right' });
      });
    }

    // 用户菜单（侧栏底部，向上弹出避免超出页面）
    var userBtn = $('.wb-user__expand');
    if (userBtn) {
      userBtn.addEventListener('click', function () {
        Dropdown.open(this, [
          { label: '个人资料', icon: 'user', onClick: openSettingsModal },
          { label: '偏好设置', icon: 'gear', onClick: openSettingsModal },
          { divider: true },
          { label: '退出登录', icon: 'logout', onClick: async function () { await DESKFORGE.auth.logout(); window.parent.location.reload(); } },
          { label: '关闭 Deskforge', icon: 'logout', danger: true, onClick: function () { return DESKFORGE.app.quit(); } },
        ], { align: 'left', width: 170, placement: 'top' });
      });
    }

    // 添加标签
    var tagAdd = $('.wb-tag--add');
    if (tagAdd) {
      tagAdd.addEventListener('click', function () {
        var panel = createEl(
          '<div style="padding:6px;">' +
            '<input class="wbi-tag-input" placeholder="输入标签，回车添加" maxlength="8">' +
          '</div>'
        );
        var input = $('input', panel);
        input.addEventListener('keydown', async function (e) {
          if (e.key === 'Enter') {
            var val = this.value.trim();
            var row = getSelectedRow();
            if (val && row) {
              await DESKFORGE.tags.add(row.getAttribute('data-task'), { name: val, color: 'green' });
              var tag = createEl('<span class="wb-tag">' + esc(val) + '</span>');
              tagAdd.parentElement.insertBefore(tag, tagAdd);
              Toast.success('标签「' + val + '」已添加');
            } else if (!row) Toast.info('请先选择任务');
            Dropdown.close();
          }
        });
        Dropdown.open(this, panel, { align: 'right' });
        setTimeout(function () { input.focus(); }, 60);
      });
    }
  }

  /* ================================================================
     13. 甘特图交互：周/月视图、翻页、回到今天
     ================================================================ */
  var GANTT = {
    windowStart: new Date(2025, 4, 18),  // 窗口起始日
    cols: 24,                            // 当前列数
    today: new Date(2025, 4, 24),        // 设计稿中的"今天"
    rows: [
      { label: '需求评审', color: '#4c8dff' },
      { label: '产品设计', color: '#00dc6e' },
      { label: '开发实现', color: '#a06cd5' },
      { label: '测试验证', color: '#9aa0a8' },
    ],
    bars: [
      { row: 2, start: new Date(2025, 4, 18), end: new Date(2025, 4, 24), name: '需求评审会',   range: '5.18 - 5.24', green: false },
      { row: 3, start: new Date(2025, 4, 22), end: new Date(2025, 5, 5),  name: '交互流程设计', range: '5.22 - 6.05', green: false },
      { row: 4, start: new Date(2025, 4, 25), end: new Date(2025, 5, 15), name: '核心功能开发', range: '5.25 - 6.15', green: true  },
      { row: 5, start: new Date(2025, 5, 10), end: new Date(2025, 5, 20), name: '测试验证',     range: '6.10 - 6.20', green: false },
    ],
  };

  var DAY_MS = 86400000;

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function renderGantt() {
    var grid = $('#wbGanttGrid');
    if (!grid) return;

    // 清空动态内容（保留网格线层与角标）
    $$('.wb-gantt__day, .wb-gantt__rowlabel, .wb-gantt__today, .wb-gantt__bar', grid)
      .forEach(function (el) { el.remove(); });

    // 更新列数样式
    var styleEl = $('#wbi-gantt-style');
    styleEl.textContent =
      '.wb-gantt__grid { grid-template-columns: 84px repeat(' + GANTT.cols + ', minmax(30px, 1fr)) !important; }';

    // 更新竖线层
    var lines = $('.wb-gantt__lines', grid);
    if (lines) {
      lines.style.backgroundImage =
        'repeating-linear-gradient(90deg, transparent 0, transparent calc(100% / ' + GANTT.cols + ' - 1px), rgba(255,255,255,.028) calc(100% / ' + GANTT.cols + ' - 1px), rgba(255,255,255,.028) calc(100% / ' + GANTT.cols + '))';
    }

    var wStart = GANTT.windowStart;
    var wEnd = new Date(wStart.getTime() + (GANTT.cols - 1) * DAY_MS);

    // 日期表头
    for (var i = 0; i < GANTT.cols; i++) {
      var date = new Date(wStart.getTime() + i * DAY_MS);
      var isToday = sameDay(date, GANTT.today);
      var cell = createEl(
        '<div class="wb-gantt__day' + (isToday ? ' wb-gantt__day--today' : '') + '">' +
          '<span>' + date.getDate() + '</span>' +
        '</div>'
      );
      cell.style.gridColumn = String(i + 2);
      cell.style.gridRow = '1';
      cell.title = (date.getMonth() + 1) + '月' + date.getDate() + '日';
      grid.appendChild(cell);
    }

    // 行标签
    GANTT.rows.forEach(function (row, i) {
      var label = createEl(
        '<div class="wb-gantt__rowlabel"><i style="background:' + row.color + '"></i>' + row.label + '</div>'
      );
      label.style.gridColumn = '1';
      label.style.gridRow = String(i + 2);
      grid.appendChild(label);
    });

    // 今日竖线
    if (GANTT.today >= wStart && GANTT.today <= wEnd) {
      var idx = Math.round((GANTT.today - wStart) / DAY_MS);
      var line = createEl('<div class="wb-gantt__today"></div>');
      line.style.gridColumn = String(idx + 2);
      grid.appendChild(line);
    }

    // 任务条（按窗口裁剪）
    GANTT.bars.forEach(function (bar) {
      var s = bar.start < wStart ? wStart : bar.start;
      var e = bar.end > wEnd ? wEnd : bar.end;
      if (e < s) return; // 窗口外
      var startIdx = Math.round((s - wStart) / DAY_MS);
      var span = Math.round((e - s) / DAY_MS) + 1;
      var el = createEl(
        '<div class="wb-gantt__bar' + (bar.green ? ' wb-gantt__bar--green' : '') + '">' +
          '<b>' + esc(bar.name) + '</b><span>' + esc(bar.range) + '</span>' +
        '</div>'
      );
      el.style.gridColumn = (startIdx + 2) + ' / span ' + span;
      el.style.gridRow = String(bar.row);
      el.title = bar.name + '（' + bar.range + '）';
      grid.appendChild(el);
    });

    // 月份标签
    var monthEl = $('.wb-gantt__month');
    if (monthEl) {
      var m1 = wStart.getMonth() + 1;
      var m2 = wEnd.getMonth() + 1;
      monthEl.textContent = m1 === m2
        ? wStart.getFullYear() + '年' + m1 + '月'
        : wStart.getFullYear() + '年' + m1 + '月 - ' + m2 + '月';
    }
  }

  function bindGanttTools() {
    var prevBtn = $('.wb-toolbtn--icon[title="上一周期"]');
    var nextBtn = $('.wb-toolbtn--icon[title="下一周期"]');
    var todayBtn = findToolBtn('今天');
    var viewBtn = findToolBtn('周');
    if (window.parent && window.parent !== window) {
      [prevBtn, nextBtn, todayBtn, viewBtn, $('.wb-gantt__title')].filter(Boolean).forEach(function (button) { button.addEventListener('click', function () { window.parent.postMessage({ type: 'deskforge:open-module', module: 'timeline' }, '*'); }); });
      return;
    }

    if (prevBtn) prevBtn.addEventListener('click', function () {
      GANTT.windowStart = new Date(GANTT.windowStart.getTime() - 7 * DAY_MS);
      renderGantt();
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      GANTT.windowStart = new Date(GANTT.windowStart.getTime() + 7 * DAY_MS);
      renderGantt();
    });
    if (todayBtn) todayBtn.addEventListener('click', function () {
      GANTT.windowStart = new Date(2025, 4, 18);
      renderGantt();
      var line = $('.wb-gantt__today');
      if (line) {
        line.style.transition = 'none';
        line.style.background = 'rgba(0,220,110,.9)';
        setTimeout(function () {
          line.style.transition = 'background .8s ease';
          line.style.background = '';
        }, 60);
      }
      Toast.info('已回到今天（5月24日）');
    });
    if (viewBtn) {
      viewBtn.addEventListener('click', function () {
        var self = this;
        Dropdown.open(self, [
          { label: '周视图（14 天）', active: GANTT.cols === 14, onClick: function () {
            GANTT.cols = 14; self.childNodes[0].textContent = '周 '; renderGantt();
          } },
          { label: '月视图（30 天）', active: GANTT.cols === 30, onClick: function () {
            GANTT.cols = 30; self.childNodes[0].textContent = '月 '; renderGantt();
          } },
          { label: '默认（24 天）', active: GANTT.cols === 24, onClick: function () {
            GANTT.cols = 24; self.childNodes[0].textContent = '周 '; renderGantt();
          } },
        ], { align: 'right' });
      });
    }
  }

  /* ================================================================
     14. 3D 卡片扇轮播（滚轮 / 拖拽 / 点击 / 键盘）
     ================================================================ */
  var FAN_META = [
    { title: '需求文档',   sub: '2025 · Q2',  progress: 92,  icon: 'doc'    },
    { title: '交互原型',   sub: 'v3.2 修订版', progress: 76,  icon: 'layers' },
    { title: '视觉设计稿', sub: '2025 · Q2',  progress: 84,  icon: 'image'  },
    { title: '项目归档',   sub: '2025 · Q2',  progress: 87,  icon: 'folder' },
    { title: '开发文档',   sub: '持续更新中',  progress: 63,  icon: 'code'   },
    { title: '测试报告',   sub: '2025 · Q2',  progress: 41,  icon: 'check'  },
    { title: '会议纪要',   sub: '2025 · 5月', progress: 100, icon: 'edit'   },
  ];

  // 扇形位置表（与原 CSS 的 nth-child 布局参数一致）
  var FAN_POS = {
    '-3': { x: -196, z: -90, ry: 38,  rz: -4,   zi: 1 },
    '-2': { x: -138, z: -55, ry: 30,  rz: -2.5, zi: 2 },
    '-1': { x: -74,  z: -25, ry: 20,  rz: -1,   zi: 3 },
    '0':  { x: 0,    z: 40,  ry: 0,   rz: 0,    zi: 6 },
    '1':  { x: 74,   z: -25, ry: -20, rz: 1,    zi: 3 },
    '2':  { x: 138,  z: -55, ry: -30, rz: 2.5,  zi: 2 },
    '3':  { x: 196,  z: -90, ry: -38, rz: 4,    zi: 1 },
  };

  var Fan = {
    el: null,
    cards: [],
    active: 3,          // 初始居中卡片（项目归档）
    n: 7,
    _wheelLock: 0,
    _wheelAcc: 0,
    _floatTimer: null,

    init: function () {
      this.el = $('.wb-fan');
      if (!this.el) return;
      this.cards = $$('.wb-fan__card', this.el);
      this.n = this.cards.length;
      var self = this;

      // 为非主卡注入：底部小标签（非居中时显示）+ 居中高亮内容（图标 + 标题）
      this.cards.forEach(function (card, i) {
        if (card.classList.contains('wb-fan__card--main')) return;
        var meta = FAN_META[i];
        if (!meta) return;
        card.appendChild(createEl('<span class="wbi-fan-tag">' + esc(meta.title) + '</span>'));
        card.appendChild(createEl(
          '<div class="wbi-fan-center">' +
            '<span class="wbi-fan-center__icon">' + icon(meta.icon) + '</span>' +
            '<span class="wbi-fan-center__title">' + esc(meta.title) + '</span>' +
          '</div>'
        ));
      });

      // 操作提示
      this.el.appendChild(createEl('<span class="wb-fan__hint">滚轮 / 拖拽切换</span>'));

      // 键盘可访问
      this.el.setAttribute('tabindex', '0');

      // ── 鼠标滚轮 ──
      this.el.addEventListener('wheel', function (e) {
        e.preventDefault();
        var now = Date.now();
        self._wheelAcc += e.deltaY;
        if (now - self._wheelLock < 140) return;
        if (Math.abs(self._wheelAcc) < 10) return;
        self.step(self._wheelAcc > 0 ? 1 : -1);
        self._wheelAcc = 0;
        self._wheelLock = now;
      }, { passive: false });

      // ── 拖拽 / 点击 ──
      var dragX = null, dragged = false;
      this.el.addEventListener('pointerdown', function (e) {
        dragX = e.clientX;
        dragged = false;
      });
      this.el.addEventListener('pointermove', function (e) {
        if (dragX === null) return;
        if (Math.abs(e.clientX - dragX) > 8) dragged = true;
      });
      this.el.addEventListener('pointerup', function (e) {
        if (dragX === null) return;
        var dx = e.clientX - dragX;
        dragX = null;
        if (Math.abs(dx) > 42) { self.step(dx < 0 ? 1 : -1); return; }
        if (!dragged) {
          var card = e.target.closest('.wb-fan__card');
          if (card) {
            var idx = self.cards.indexOf(card);
            if (idx > -1 && idx !== self.active) { self.active = idx; self.layout(); }
          }
        }
      });
      this.el.addEventListener('pointerleave', function () { dragX = null; });

      // ── 键盘 ──
      this.el.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft')  { self.step(-1); e.preventDefault(); }
        if (e.key === 'ArrowRight') { self.step(1);  e.preventDefault(); }
      });

      this.layout(true);
    },

    norm: function (i) { return ((i % this.n) + this.n) % this.n; },

    step: function (d) {
      this.active = this.norm(this.active + d);
      this.layout();
    },

    relPos: function (i) {
      var p = (i - this.active) % this.n;
      if (p > this.n / 2) p -= this.n;
      if (p < -this.n / 2) p += this.n;
      return p;
    },

    layout: function (instant) {
      var self = this;
      this.cards.forEach(function (card, i) {
        var p = self.relPos(i);
        var cfg = FAN_POS[String(p)];
        var t = 'translateX(' + cfg.x + 'px) translateZ(' + cfg.z + 'px) rotateY(' + cfg.ry + 'deg) rotateZ(' + cfg.rz + 'deg)';
        if (p === 0) t += ' scale(1.05)';
        // inline !important 覆盖原 hover 提升规则，保证轮播位置稳定
        card.style.setProperty('transform', t, 'important');
        card.style.setProperty('z-index', String(cfg.zi), 'important');
        card.style.setProperty('opacity', Math.abs(p) === 3 ? '0.5' : '1', 'important');
        card.classList.toggle('is-center', p === 0);
      });
      if (!instant) this.updateFloat();
    },

    // 悬浮统计卡联动
    updateFloat: function () {
      var meta = FAN_META[this.active];
      var floatEl = $('.wb-fan__float', this.el);
      if (!meta || !floatEl) return;
      var self = this;
      floatEl.classList.add('is-switching');
      clearTimeout(this._floatTimer);
      this._floatTimer = setTimeout(function () {
        var titleEl = $('.wb-fan__float-title', floatEl);
        var subEl = $('.wb-fan__float-sub', floatEl);
        var numEl = $('.wb-fan__float-num', floatEl);
        var barEl = $('.wb-fan__float-bar i', floatEl);
        if (titleEl) titleEl.textContent = meta.title;
        if (subEl) subEl.textContent = meta.sub;
        if (numEl) numEl.innerHTML = meta.progress + '<small>%</small>';
        if (barEl) barEl.style.width = meta.progress + '%';
        floatEl.classList.remove('is-switching');
      }, 160);
    },
  };

  /* ================================================================
     15. 启动
     ================================================================ */
  async function init() {
    await restoreState();
    injectStyles();
    augmentExistingRows();
    await initializeTaskBackend();
    await loadSettings();
    if (DESKFORGE && DESKFORGE.workbench) applyWorkbenchSummary(await DESKFORGE.workbench.dashboard());
    bindFilterSources();
    bindKanbanTools();
    bindTaskDelegation();
    bindActionButtons();
    bindHeaderPanels();
    bindWorkbenchNavigation();
    bindGanttTools();
    Fan.init();
    watchPersistence();

    // 支持通过 #task=WXB-2025-001 定位任务
    if (location.hash.indexOf('#task=') === 0) {
      var id = location.hash.replace('#task=', '');
      var row = $('.wb-task[data-task="' + id + '"]');
      if (row) {
        selectTaskRow(row);
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
