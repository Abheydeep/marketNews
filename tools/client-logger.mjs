/**
 * Client-side error tracking and logging script module.
 * Respects ESM and the 200-line budget constraint.
 */

export function clientLoggerScript() {
  return `
    (function() {
      function sendLog(level, message, error) {
        try {
          const payload = JSON.stringify({
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            url: window.location.href,
            userAgent: navigator.userAgent,
            stack: error && error.stack ? String(error.stack) : null
          });
          if (navigator.sendBeacon) {
            navigator.sendBeacon("/api/log/", payload);
          } else {
            fetch("/api/log/", { method: "POST", body: payload, keepalive: true });
          }
        } catch (err) {
          // Fail silent on logger failure
        }
      }

      window.addEventListener("error", function(e) {
        sendLog("error", e.message || "Uncaught Error", e.error);
      });

      window.addEventListener("unhandledrejection", function(e) {
        sendLog("error", "Unhandled promise rejection: " + (e.reason ? (e.reason.message || e.reason) : "unknown"), e.reason);
      });
    })();
  `;
}
