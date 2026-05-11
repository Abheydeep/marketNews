export const DEFAULT_PREMARKET_LATE_CUTOFF_MINUTES = 45;

export function premarketPublishWindowStatus({
  date,
  scheduledTime = "07:15",
  now = new Date(),
  cutoffMinutes = DEFAULT_PREMARKET_LATE_CUTOFF_MINUTES
} = {}) {
  const scheduledFor = `${date}T${scheduledTime}:00+05:30`;
  const scheduledMs = Date.parse(scheduledFor);
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!date || !Number.isFinite(scheduledMs) || !Number.isFinite(nowMs)) {
    return {
      scheduledFor,
      minutesAfterScheduled: 0,
      cutoffMinutes,
      isLate: false,
      reason: "publish window unavailable"
    };
  }
  const minutesAfterScheduled = Math.round((nowMs - scheduledMs) / 60000);
  return {
    scheduledFor,
    minutesAfterScheduled,
    cutoffMinutes,
    isLate: minutesAfterScheduled > cutoffMinutes,
    reason: minutesAfterScheduled > cutoffMinutes
      ? `run started ${minutesAfterScheduled} minutes after ${scheduledTime} IST`
      : "inside pre-market publish window"
  };
}

export function assertPremarketPublishWindow(options = {}) {
  const status = premarketPublishWindowStatus(options);
  if (status.isLate) {
    throw new Error(
      `Premarket publish blocked: ${status.reason}. ` +
      `Set ALLOW_LATE_PREMARKET_PUBLISH=true only for an explicit manual recovery run.`
    );
  }
  return status;
}
