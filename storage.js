const STORAGE_KEY = "todo-app-tasks-v1";

// Đọc danh sách todo từ localStorage, trả về mảng nếu có dữ liệu.
export function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Không thể đọc localStorage", error);
    return [];
  }
}

// Lưu danh sách todo vào localStorage dưới dạng JSON.
export function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// Tạo một task mới với trạng thái mặc định pending.
export function createTask(title, dateTime) {
  return {
    id: `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: title.trim(),
    dateTime,
    status: "pending",
    createdAt: new Date().toISOString(),
    notified: false,
  };
}

// Thêm task mới vào đầu danh sách và cập nhật localStorage.
export function addTask(tasks, task) {
  const nextTasks = [task, ...tasks];
  saveTasks(nextTasks);
  return nextTasks;
}

// Cập nhật trạng thái task rồi lưu lại.
export function updateTaskStatus(tasks, taskId, status) {
  const nextTasks = tasks.map((task) =>
    task.id === taskId ? { ...task, status } : task,
  );
  saveTasks(nextTasks);
  return nextTasks;
}

// Xóa task khỏi danh sách và lưu lại.
export function removeTask(tasks, taskId) {
  const nextTasks = tasks.filter((task) => task.id !== taskId);
  saveTasks(nextTasks);
  return nextTasks;
}

// Đánh dấu task đã được thông báo để không báo lần nữa.
export function markTaskNotified(tasks, taskId) {
  const nextTasks = tasks.map((task) =>
    task.id === taskId ? { ...task, notified: true } : task,
  );
  saveTasks(nextTasks);
  return nextTasks;
}
