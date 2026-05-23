// Main entry point cho ứng dụng. Dùng module để tách trách nhiệm rõ ràng.
import {
  addTask,
  createTask,
  loadTasks,
  markTaskNotified,
  removeTask,
  updateTaskStatus,
  saveTasks,
} from "./storage.js";
import { formatDateTime, clampString } from "./utils.js";
import {
  playAlarmSound,
  requestNotificationPermission,
  showBrowserNotification,
  stopAlarmSound,
} from "./notification.js";

// DOM references được lưu lại một lần để dễ quản lý.
const taskForm = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const dateInput = document.querySelector("#task-date");
const filterSelect = document.querySelector("#task-filter");
const taskList = document.querySelector("#task-list");
const filterBadge = document.querySelector("#active-filter");
const modalBackdrop = document.querySelector("#reminder-modal");
const modalTitle = document.querySelector("#modal-title");
const modalDate = document.querySelector("#modal-date");
const modalCompleteButton = document.querySelector("#complete-task");
const modalDismissButton = document.querySelector("#dismiss-task");
const modalStatus = document.querySelector("#modal-status");

// Load dữ liệu từ localStorage khi trang mở.
let tasks = loadTasks();
let filterState = "all";
const reminderTimeouts = new Map();
let activeTaskId = null;

// Cập nhật nhãn bộ lọc theo trạng thái hiện tại.
function updateFilterBadge() {
  const label =
    filterState === "all"
      ? "Tất cả"
      : filterState === "pending"
        ? "Đang chờ"
        : filterState === "completed"
          ? "Hoàn thành"
          : "Lỡ hẹn";
  filterBadge.textContent = label;
}

// Hiển thị các task trong danh sách. Gắn thêm nút thao tác và trạng thái tương ứng.
function renderTasks() {
  const filteredTasks = tasks.filter((task) => {
    if (filterState === "all") return true;
    return task.status === filterState;
  });

  taskList.innerHTML = "";

  if (filteredTasks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent =
      "Không có công việc ở trạng thái này. Hãy tạo một nhiệm vụ mới.";
    taskList.appendChild(empty);
    return;
  }

  filteredTasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = "task-card";

    const heading = document.createElement("h3");
    heading.textContent = clampString(task.title, 80);

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const dateBadge = document.createElement("span");
    dateBadge.textContent = formatDateTime(task.dateTime);

    const statusBadge = document.createElement("span");
    statusBadge.className = `status-pill status-${task.status}`;
    statusBadge.textContent =
      task.status === "pending"
        ? "Pending"
        : task.status === "completed"
          ? "Completed"
          : "Missed";

    meta.append(dateBadge, statusBadge);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const removeButton = document.createElement("button");
    removeButton.className = "secondary-btn";
    removeButton.textContent = "Xóa";
    removeButton.addEventListener("click", () => handleRemoveTask(task.id));

    const completeButton = document.createElement("button");
    completeButton.className = "primary-btn";
    completeButton.textContent = "Hoàn thành";
    completeButton.disabled = task.status !== "pending";
    completeButton.addEventListener("click", () =>
      updateTaskStatusHandler(task.id, "completed"),
    );

    actions.append(completeButton, removeButton);

    card.append(heading, meta, actions);
    taskList.appendChild(card);
  });
}

// Xóa task khỏi danh sách và dọn timeout liên quan.
function handleRemoveTask(taskId) {
  tasks = removeTask(tasks, taskId);
  clearReminder(taskId);
  renderTasks();
}

// Cập nhật trạng thái task, ví dụ thành completed hoặc missed.
function updateTaskStatusHandler(taskId, status) {
  tasks = updateTaskStatus(tasks, taskId, status);
  clearReminder(taskId);
  stopAlarmSound();
  renderTasks();
  closeModal();
}

// Dọn bộ đếm thời gian nếu task bị xóa hoặc hoàn thành trước khi timeout.
function clearReminder(taskId) {
  if (reminderTimeouts.has(taskId)) {
    clearTimeout(reminderTimeouts.get(taskId));
    reminderTimeouts.delete(taskId);
  }
}

// Mở hộp thoại nhắc nhở trên trang.
function openModal(task) {
  activeTaskId = task.id;
  modalTitle.textContent = task.title;
  modalDate.textContent = formatDateTime(task.dateTime);
  modalStatus.textContent =
    'Lưu ý: Nhấn "Hoàn thành" nếu bạn đã hoàn tất công việc.';
  modalBackdrop.classList.add("active");
}

// Đóng popup thông báo bên trong app.
function closeModal() {
  modalBackdrop.classList.remove("active");
  activeTaskId = null;
}

// Nếu người dùng không phản hồi trong 1 phút, bật trạng thái missed.
function scheduleMissedTask(taskId) {
  if (reminderTimeouts.has(taskId)) {
    return;
  }

  const timeout = setTimeout(() => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status !== "pending") {
      return;
    }

    tasks = updateTaskStatus(tasks, taskId, "missed");
    stopAlarmSound();
    closeModal();
    renderTasks();
  }, 60_000);

  reminderTimeouts.set(taskId, timeout);
}

// Khi đến giờ, gửi thông báo và bật popup + âm thanh.
function triggerTaskReminder(task) {
  if (task.notified || task.status !== "pending") {
    return;
  }

  requestNotificationPermission().then(() => {
    showBrowserNotification(task);
  });

  playAlarmSound();
  tasks = markTaskNotified(tasks, task.id);
  scheduleMissedTask(task.id);
  openModal(task);
  renderTasks();
}

// Kiểm tra các task mỗi giây để phát hiện công việc đến hạn.
function scanDueTasks() {
  const now = new Date();
  tasks.forEach((task) => {
    if (task.status !== "pending") {
      return;
    }

    const due = new Date(task.dateTime);
    if (due <= now && !task.notified) {
      triggerTaskReminder(task);
    }
  });
}

// Xử lý form thêm task mới và lưu vào localStorage.
function handleSubmit(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const dateTime = dateInput.value;

  if (!title || !dateTime) {
    alert("Vui lòng điền đầy đủ tên công việc và ngày giờ.");
    return;
  }

  const dueDate = new Date(dateTime);
  if (dueDate < new Date()) {
    alert("Ngày giờ hẹn phải nằm trong tương lai.");
    return;
  }

  const task = createTask(title, dateTime);
  tasks = addTask(tasks, task);
  taskForm.reset();
  renderTasks();
}

// Thay đổi bộ lọc task theo trạng thái.
function handleFilterChange(event) {
  filterState = event.target.value;
  updateFilterBadge();
  renderTasks();
}

modalCompleteButton.addEventListener("click", () => {
  if (activeTaskId) {
    updateTaskStatusHandler(activeTaskId, "completed");
  }
});

modalDismissButton.addEventListener("click", () => {
  closeModal();
});

modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) {
    closeModal();
  }
});

taskForm.addEventListener("submit", handleSubmit);
filterSelect.addEventListener("change", handleFilterChange);

// Khởi tạo giao diện khi mở app lần đầu.
updateFilterBadge();
renderTasks();
scanDueTasks();
setInterval(scanDueTasks, 1000);
