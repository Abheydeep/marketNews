import { chartClientScript, chartClientSparklineScript } from "./chart-svg.mjs";

// Client-side indices polling and real-time DOM update script.
export function indicesLiveScript() {
  return `<script>
    (function() {
      let lastSuccess = Date.now();
      const prevPrices = {};
      let pollTimeout = null;

      function getPollIntervalMs() {
        const now = new Date();
        const utc = now.getTime() + now.getTimezoneOffset() * 60000;
        const ist = new Date(utc + 3600000 * 5.5);
        const day = ist.getDay();
        const hour = ist.getHours();
        const minute = ist.getMinutes();
        const isTrading = day > 0 && day < 6;
        if (!isTrading) return 300000; // 5 min
        const hm = hour * 100 + minute;
        if (hm >= 600 && hm < 915) return 15000;  // 15s pre-market
        if (hm >= 915 && hm < 1530) return 30000;  // 30s market
        if (hm >= 1530 && hm < 2330) return 60000; // 60s post-market
        return 300000; // overnight
      }

      function formatChangeStr(close, prevClose, pctChange) {
        const chg = pctChange || 0;
        const pts = close - (prevClose || close);
        const sign = chg > 0 ? "+" : "";
        const ptsStr = Number.isFinite(pts) && pts !== 0 ? (pts > 0 ? "+" : "") + pts.toFixed(1) + " pts" : "";
        return sign + chg.toFixed(2) + "%" + (ptsStr ? " (" + ptsStr + ")" : "");
      }

      function getHeatClass(pct) {
        if (pct > 1.5) return "idx-heat-bg-pos-3";
        if (pct > 0.5) return "idx-heat-bg-pos-2";
        if (pct > 0.05) return "idx-heat-bg-pos-1";
        if (pct < -1.5) return "idx-heat-bg-neg-3";
        if (pct < -0.5) return "idx-heat-bg-neg-2";
        if (pct < -0.05) return "idx-heat-bg-neg-1";
        return "";
      }

      function flashElement(el, isUp) {
        const cls = isUp ? "idx-flash-up" : "idx-flash-down";
        el.classList.remove("idx-flash-up", "idx-flash-down");
        void el.offsetWidth; // trigger reflow
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), 600);
      }

      ${chartClientScript()}

      ${chartClientSparklineScript()}

      async function poll() {
        try {
          const res = await window["fetch"]("/api/live-indices/");
          if (!res.ok) throw new Error("status_" + res.status);
          const data = await res.json();
          if (!data || !Array.isArray(data.snapshots)) throw new Error("malformed_payload");

          lastSuccess = Date.now();
          const badge = document.getElementById("idx-live-badge");
          if (badge) {
            badge.classList.remove("offline");
            badge.textContent = "● Live · updated just now";
          }

          const niftyClose = Number(document.querySelector(".idx")?.dataset.niftyClose || 0);

          data.snapshots.forEach(s => {
            const valStr = s.closeValue ? s.closeValue.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "N/A";
            const pct = Number(s.changePercent || 0);
            const dirClass = pct > 0.05 ? "idx-pos" : pct < -0.05 ? "idx-neg" : "idx-flat";
            const changeText = formatChangeStr(s.closeValue, s.previousClose, pct);

            // Flash if changed
            const prev = prevPrices[s.symbol];
            const hasChanged = prev !== undefined && prev !== s.closeValue;
            prevPrices[s.symbol] = s.closeValue;

            document.querySelectorAll('[data-live="' + s.symbol + '"]').forEach(el => {
              // Update attributes on card buttons
              if (el.tagName === "BUTTON") {
                el.dataset.val = valStr;
                el.dataset.change = changeText;
                el.dataset.cls = dirClass;
                // Update heatbg class
                el.className = "idx-card " + getHeatClass(pct);

                // Repaint card sparkline
                const svg = el.querySelector('[data-field="spark"]');
                if (svg && s.spark) {
                  svg.dataset.cls = dirClass;
                  svg.dataset.pts = JSON.stringify(s.spark);
                  drawSparklineSvg(svg, s.spark, s.symbol === "GIFTNIFTY" ? "idx-flat" : dirClass);
                }
              }

              // Update fields
              el.querySelectorAll("[data-field]").forEach(f => {
                const type = f.dataset.field;
                if (type === "ltp") {
                  if (el.tagName === "BUTTON" || el.classList.contains("idx-clock") || el.classList.contains("idx-vix")) {
                    f.textContent = (type === "ltp" && (el.classList.contains("idx-vix") || s.symbol === "INDIAVIX")) ? "LTP: " + s.closeValue.toFixed(2) : "LTP: " + valStr;
                  } else {
                    f.textContent = valStr;
                  }
                } else if (type === "pct") {
                  f.textContent = (s.symbol === "GIFTNIFTY" && !el.classList.contains("idx-card")) ? changeText : (pct > 0 ? "+" : "") + pct.toFixed(2) + "%";
                  f.className = (s.symbol === "GIFTNIFTY" && !el.classList.contains("idx-card")) ? (pct >= 0 ? "idx-pos" : "idx-neg") : ("idx-card-change " + dirClass);
                } else if (type === "quality") {
                  f.textContent = s.dataQuality === "live" ? "● Live" : "Delayed";
                }
              });

              if (s.symbol === "INDIAVIX") {
                const pin = document.getElementById("idx-vix-pin");
                if (pin) {
                  const vixPct = Math.min(100, Math.max(0, ((s.closeValue - 10) / 25) * 100));
                  pin.style.left = vixPct + "%";
                }
              }

              if (s.symbol === "GIFTNIFTY" && niftyClose > 0) {
                const gapPts = Number((s.closeValue - niftyClose).toFixed(1));
                const gapPct = Number(((gapPts / niftyClose) * 100).toFixed(2));
                const gapEl = el.querySelector('[data-field="gap"]') || document.querySelector('[data-field="gap"]');
                if (gapEl) {
                  gapEl.textContent = (gapPts > 0 ? "+" : "") + gapPts + " pts (" + (gapPct > 0 ? "+" : "") + gapPct + "%)";
                  gapEl.className = gapPts >= 0 ? "idx-pos" : "idx-neg";
                }
              }

              if (hasChanged) {
                flashElement(el, s.closeValue > prev);
              }
            });
          });
        } catch (err) {
          const badge = document.getElementById("idx-live-badge");
          if (badge) {
            badge.classList.add("offline");
            badge.textContent = "⚠ Offline · showing baked data";
          }
        } finally {
          pollTimeout = setTimeout(poll, getPollIntervalMs());
        }
      }

      // Keep badge elapsed time fresh
      setInterval(() => {
        const badge = document.getElementById("idx-live-badge");
        if (!badge || badge.classList.contains("offline")) return;
        const s = Math.floor((Date.now() - lastSuccess) / 1000);
        if (s <= 1) {
          badge.textContent = "● Live · updated just now";
        } else {
          badge.textContent = "● Live · updated " + s + "s ago";
        }
      }, 1000);

      poll();
    })();
  </script>`;
}
