const REPEAT_MS = { daily: 86400000, weekly: 604800000 };

function createReminderService(db) {
  const required = (value, label, max = 120) => {
    const text = String(value || '').trim();
    if (!text) throw new Error(`${label}不能为空`);
    if (text.length > max) throw new Error(`${label}不能超过${max}个字符`);
    return text;
  };
  const row = (item) => item && ({ ...item, id: Number(item.id) });
  const select = `SELECT id,task_code AS taskCode,title,remind_at AS remindAt,repeat_rule AS repeatRule,status,notified_at AS notifiedAt,created_at AS createdAt FROM reminders`;
  return {
    list() { return db.prepare(`${select} ORDER BY datetime(remind_at),id`).all().map(row); },
    create(input) {
      const title = required(input && input.title, '提醒标题');
      const date = new Date(input && input.remindAt);
      if (Number.isNaN(date.getTime())) throw new Error('提醒时间无效');
      const repeatRule = ['none', 'daily', 'weekly'].includes(input && input.repeatRule) ? input.repeatRule : 'none';
      const taskCode = input && input.taskCode ? required(input.taskCode, '任务编号', 40) : null;
      if (taskCode && !db.prepare('SELECT code FROM tasks WHERE code=?').get(taskCode)) throw new Error('任务不存在');
      const result = db.prepare('INSERT INTO reminders(task_code,title,remind_at,repeat_rule) VALUES (?,?,?,?)').run(taskCode, title, date.toISOString(), repeatRule);
      return row(db.prepare(`${select} WHERE id=?`).get(Number(result.lastInsertRowid)));
    },
    dismiss(id) { return Boolean(db.prepare("UPDATE reminders SET status='dismissed',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(Number(id)).changes); },
    remove(id) { return Boolean(db.prepare('DELETE FROM reminders WHERE id=?').run(Number(id)).changes); },
    claimDue(now = new Date()) {
      const nowIso = now.toISOString();
      const due = db.prepare(`${select} WHERE status='pending' AND datetime(remind_at)<=datetime(?) ORDER BY datetime(remind_at),id`).all(nowIso);
      const finish = db.prepare("UPDATE reminders SET status='notified',notified_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?");
      const repeat = db.prepare("UPDATE reminders SET remind_at=?,notified_at=?,status='pending',updated_at=CURRENT_TIMESTAMP WHERE id=?");
      db.exec('BEGIN IMMEDIATE');
      try {
        due.forEach((item) => {
          if (REPEAT_MS[item.repeatRule]) repeat.run(new Date(now.getTime() + REPEAT_MS[item.repeatRule]).toISOString(), nowIso, item.id);
          else finish.run(nowIso, item.id);
        });
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      return due.map(row);
    },
  };
}

module.exports = { createReminderService };
