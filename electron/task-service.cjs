const PRIORITIES = new Set(['高', '中', '低']);
const STATUSES = new Set(['todo', 'doing', 'done']);
const COLORS = new Set(['blue', 'green', 'violet']);

function createTaskService(repository) {
  function requiredText(value, field, maxLength) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) throw new Error(`${field}不能为空`);
    if (text.length > maxLength) throw new Error(`${field}不能超过${maxLength}个字符`);
    return text;
  }

  function optionalText(value, maxLength) {
    const text = typeof value === 'string' ? value.trim() : '';
    return text.slice(0, maxLength);
  }

  function assertGroup(groupId) {
    const id = Number(groupId);
    if (!Number.isInteger(id) || !repository.groupExists(id)) throw new Error('任务分组不存在');
    return id;
  }

  function normalizeTask(input, existing = {}) {
    const priority = input.priority ?? existing.priority ?? '中';
    const status = input.status ?? existing.status ?? 'todo';
    if (!PRIORITIES.has(priority)) throw new Error('任务优先级无效');
    if (!STATUSES.has(status)) throw new Error('任务状态无效');

    return {
      ...existing,
      groupId: assertGroup(input.groupId ?? existing.groupId),
      name: requiredText(input.name ?? existing.name, '任务名称', 100),
      description: optionalText(input.description ?? existing.description, 5000),
      priority,
      status,
      deadline: optionalText(input.deadline ?? existing.deadline, 40) || null,
      owner: optionalText(input.owner ?? existing.owner, 80) || 'brandon',
      participant: input.participant ?? existing.participant ?? true,
      position: Number.isInteger(input.position) ? input.position : (existing.position ?? 0),
    };
  }

  function list() {
    const groups = repository.listGroups().map((group) => ({ ...group, tasks: [] }));
    const byId = new Map(groups.map((group) => [group.id, group]));
    repository.listTasks().forEach((task) => {
      const group = byId.get(task.groupId);
      if (group) group.tasks.push(task);
    });
    return groups;
  }

  return {
    list,
    seed(groups) {
      if (!Array.isArray(groups)) throw new Error('初始化数据格式无效');
      const normalized = groups.map((group, groupIndex) => ({
        name: requiredText(group.name, '分组名称', 50),
        color: COLORS.has(group.color) ? group.color : 'blue',
        position: groupIndex,
        tasks: Array.isArray(group.tasks) ? group.tasks.map((task, taskIndex) => ({
          id: optionalText(task.id, 40) || null,
          name: requiredText(task.name, '任务名称', 100),
          description: optionalText(task.description, 5000),
          priority: PRIORITIES.has(task.priority) ? task.priority : '中',
          status: STATUSES.has(task.status) ? task.status : 'todo',
          deadline: optionalText(task.deadline, 40) || null,
          owner: optionalText(task.owner, 80) || 'brandon',
          participant: task.participant !== false,
          position: taskIndex,
        })) : [],
      }));
      repository.seed(normalized);
      return list();
    },
    createGroup(input) {
      const groups = repository.listGroups();
      return repository.createGroup({
        name: requiredText(input.name, '分组名称', 50),
        color: COLORS.has(input.color) ? input.color : 'blue',
        position: groups.length,
      });
    },
    createTask(input) {
      return repository.createTask(normalizeTask(input));
    },
    updateTask(id, input) {
      const existing = repository.getTask(requiredText(id, '任务编号', 40));
      if (!existing || existing.archived) throw new Error('任务不存在');
      return repository.updateTask(normalizeTask(input, existing));
    },
    completeTask(id) {
      const task = repository.completeTask(requiredText(id, '任务编号', 40));
      if (!task) throw new Error('任务不存在');
      return task;
    },
    archiveTask(id) {
      if (!repository.archiveTask(requiredText(id, '任务编号', 40))) throw new Error('任务不存在');
      return true;
    },
    removeTask(id) {
      if (!repository.removeTask(requiredText(id, '任务编号', 40))) throw new Error('任务不存在');
      return true;
    },
  };
}

module.exports = { createTaskService };
