// Notification API + Audio API helpers.
let audioContext;
let oscillator;

// Yêu cầu quyền thông báo từ trình duyệt trước khi gửi notification.
export function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return Promise.resolve(false);
  }

  if (Notification.permission === "granted") {
    return Promise.resolve(true);
  }

  if (Notification.permission === "denied") {
    return Promise.resolve(false);
  }

  return Notification.requestPermission().then(
    (permission) => permission === "granted",
  );
}

// Phát tiếng chuông cảnh báo bằng Web Audio API.
export function playAlarmSound() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  audioContext = audioContext || new AudioCtx();
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => null);
  }

  if (oscillator) {
    return;
  }

  oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 660;
  gain.gain.value = 0.15;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
}

// Dừng âm thanh khi task đã xử lý.
export function stopAlarmSound() {
  if (!oscillator) {
    return;
  }
  oscillator.stop();
  oscillator.disconnect();
  oscillator = null;
}

// Hiển thị notification trên trình duyệt nếu quyền đã được cấp.
export function showBrowserNotification(task) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return null;
  }

  const notification = new Notification("Todo reminder: " + task.title, {
    body: `Hẹn lúc ${new Date(task.dateTime).toLocaleString("vi-VN")}`,
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M13 16h-1v-4h-1"/%3E%3Cpath d="M12 8h.01"/%3E%3Cpath d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-3.1-11.3 8.38 8.38 0 0 1 3.8-.9"/%3E%3C/svg%3E',
    badge: "",
  });

  notification.onclick = () => window.focus();
  return notification;
}
