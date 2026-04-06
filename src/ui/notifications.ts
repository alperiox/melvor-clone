const NOTIFICATION_DURATION = 3000;
const MAX_NOTIFICATIONS = 5;

let container: HTMLElement | null = null;

function getContainer(): HTMLElement {
  if (!container) {
    container = document.getElementById("notifications")!;
  }
  return container;
}

export function showNotification(message: string, type: "success" | "info" | "warning" = "info"): void {
  const el = document.createElement("div");
  el.className = `notification notification-${type}`;
  el.textContent = message;

  const c = getContainer();

  // Limit visible notifications
  while (c.children.length >= MAX_NOTIFICATIONS) {
    c.removeChild(c.firstChild!);
  }

  c.appendChild(el);

  // Trigger enter animation
  requestAnimationFrame(() => el.classList.add("visible"));

  // Auto-remove
  setTimeout(() => {
    el.classList.remove("visible");
    setTimeout(() => el.remove(), 300);
  }, NOTIFICATION_DURATION);
}
