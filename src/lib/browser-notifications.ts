/**
 * Browser Notification helper — shows native OS notifications
 * when the app tab is not focused. Works on all modern browsers.
 */

let permissionGranted = false;

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") {
    permissionGranted = true;
    return true;
  }
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  permissionGranted = result === "granted";
  return permissionGranted;
};

export const showBrowserNotification = (title: string, body: string, icon = "🔔") => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  // Only show if tab is not focused
  if (!document.hidden) return;
  try {
    const notification = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: `seniorsphere-${Date.now()}`,
      requireInteraction: false,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    // Auto-close after 8 seconds
    setTimeout(() => notification.close(), 8000);
  } catch (e) {
    console.error("Failed to show notification:", e);
  }
};

export const isNotificationSupported = () => "Notification" in window;
export const isNotificationPermitted = () => Notification.permission === "granted";
