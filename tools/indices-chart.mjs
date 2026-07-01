import { chartClientScript, chartClientDrawScript } from "./chart-svg.mjs";

export function indicesChartScript() {
  return `<script>
    (function() {
      ${chartClientScript()}

      const chartCache = {};
      let currentSymbol = "";
      let currentCls = "idx-flat";
      let activeRange = "1d";

      const rangeLabels = {
        "1d": "1D", "5d": "5D", "1mo": "1M", "3mo": "3M",
        "6mo": "6M", "1y": "1Y", "3y": "3Y", "5y": "5Y", "max": "MAX"
      };

      function formatValue(val) {
        return Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }

      ${chartClientDrawScript()}

      function updateStats(meta) {
        document.getElementById("idx-stat-max").textContent = formatValue(meta.max);
        document.getElementById("idx-stat-min").textContent = formatValue(meta.min);
        const chg = meta.changePct;
        const el = document.getElementById("idx-stat-chg");
        el.textContent = (chg >= 0 ? "+" : "") + chg.toFixed(2) + "%";
        el.className = chg >= 0 ? "idx-pos" : "idx-neg";
      }

      async function selectRange(range) {
        activeRange = range;
        document.querySelectorAll(".idx-tab-btn").forEach(btn => {
          btn.classList.toggle("active", btn.dataset.range === range);
        });

        const cacheKey = currentSymbol + ":" + range;
        if (chartCache[cacheKey]) {
          const cached = chartCache[cacheKey];
          drawChartSvg(cached.points, cached.meta, currentCls);
          updateStats(cached.meta);
          return;
        }

        const svg = document.getElementById("idx-svg");
        if (svg) {
          svg.innerHTML = '<text x="270" y="110" text-anchor="middle" fill="var(--muted-idx)" font-size="14">Loading chart data...</text>';
        }

        try {
          const res = await window["fetch"]("/api/chart?symbol=" + currentSymbol + "&range=" + range);
          if (!res.ok) throw new Error("fetch_failed");
          const data = await res.json();
          if (!data || !data.ok) throw new Error("api_error");

          chartCache[cacheKey] = data;
          if (activeRange === range && currentSymbol === data.symbol) {
            drawChartSvg(data.points, data.meta, currentCls);
            updateStats(data.meta);
          }
        } catch (err) {
          if (activeRange === range) {
            svg.innerHTML = '<text x="270" y="110" text-anchor="middle" fill="#fb7185" font-size="14">Failed to load chart</text>';
            document.getElementById("idx-stat-max").textContent = "—";
            document.getElementById("idx-stat-min").textContent = "—";
            document.getElementById("idx-stat-chg").textContent = "—";
            document.getElementById("idx-stat-chg").className = "";
          }
        }
      }

      document.body.addEventListener("click", function(e) {
        const card = e.target.closest(".idx-card");
        if (!card) return;
        const d = card.dataset;
        currentSymbol = d.symbol;
        currentCls = d.cls;

        document.getElementById("idx-sym").textContent = d.symbol;
        document.getElementById("idx-name").textContent = d.name;
        const v = document.getElementById("idx-val");
        v.className = "move " + d.cls;
        v.textContent = d.val + " · " + d.change;
        document.getElementById("idx-ctx").textContent = d.ctx || (d.name + " is tracked as index reference.");
        document.getElementById("idx-m").classList.add("open");

        // Reset tab
        activeRange = "1d";
        document.querySelectorAll(".idx-tab-btn").forEach(btn => {
          btn.classList.toggle("active", btn.dataset.range === "1d");
        });

        // Toggle proxy alert note
        const note = document.getElementById("idx-proxy-note");
        if (note) {
          if (currentSymbol === "GIFTNIFTY") {
            note.textContent = "Historical view tracks Nifty 50 (the underlying index GIFT futures follow). Live GIFT quote shown above.";
            note.style.display = "block";
          } else {
            note.style.display = "none";
          }
        }

        // Draw 1D instantly using card data-pts
        try {
          const pts = JSON.parse(d.pts || "[]");
          if (pts.length > 1) {
            const min = Math.min(...pts);
            const max = Math.max(...pts);
            const first = pts[0];
            const last = pts[pts.length - 1];
            const changePct = first !== 0 ? ((last - first) / first) * 100 : 0;
            const points = pts.map((val, i) => ({ t: i, c: val }));
            const meta = { min, max, first, last, changePct };

            drawChartSvg(points, meta, currentCls);
            updateStats(meta);
          }
        } catch (err) {
        }

        // Lazy fetch actual 1d chart for stats accuracy
        selectRange("1d");
      });

      // Bind tab buttons click
      document.body.addEventListener("click", function(e) {
        const tabBtn = e.target.closest(".idx-tab-btn");
        if (tabBtn) {
          selectRange(tabBtn.dataset.range);
        }
      });
    })();
  </script>`;
}
