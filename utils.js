// Định dạng chuỗi datetime để hiển thị theo chuẩn Việt Nam.
export function formatDateTime(dateTimeString) {
  const date = new Date(dateTimeString);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

// Tạo phần tử DOM với tùy chọn class, text, và attributes.
export function createElement(tag, options = {}) {
  const element = document.createElement(tag);

  if (options.classes) {
    element.className = options.classes;
  }

  if (options.text) {
    element.textContent = options.text;
  }

  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  return element;
}

// Rút ngắn chuỗi nếu quá dài, dùng cho tiêu đề task.
export function clampString(value, maxLength = 120) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}
