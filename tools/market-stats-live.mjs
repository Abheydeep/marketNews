export function marketStatsLiveScript() {
  return `<script>
  (() => {
    const status = document.getElementById("market-stats-live-status");
    const formatValue = (value) => Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
    const formatChange = (snapshot) => {
      const pct = Number(snapshot.changePercent || 0);
      return (pct > 0 ? "+" : "") + pct.toFixed(2) + "%";
    };
    const formatTimestamp = (value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "latest live check";
      return date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }) + " IST";
    };
    function applySnapshot(snapshot) {
      const card = document.querySelector('[data-stat-live="' + snapshot.symbol + '"]');
      if (!card) return;
      const pctEl = card.querySelector('[data-stat-field="pct"]');
      const detailEl = card.querySelector('[data-stat-field="detail"]');
      if (pctEl) {
        pctEl.textContent = formatChange(snapshot);
        pctEl.className = Number(snapshot.changePercent || 0) >= 0 ? "up" : "down";
      }
      if (detailEl) {
        detailEl.textContent = snapshot.name + " - " + formatValue(snapshot.closeValue) + " at " + formatTimestamp(snapshot.dataTimestamp);
      }
    }
    async function refresh() {
      try {
        const res = await window.fetch("/api/live-indices/");
        if (!res.ok) throw new Error("status_" + res.status);
        const data = await res.json();
        if (!Array.isArray(data.snapshots)) throw new Error("malformed_payload");
        data.snapshots.forEach(applySnapshot);
        if (status) status.textContent = "Live values synced with Indices · " + formatTimestamp(data.ts);
      } catch {
        if (status) status.textContent = "Briefing snapshot shown; live sync unavailable";
      }
    }
    refresh();
  })();
  </script>`;
}
