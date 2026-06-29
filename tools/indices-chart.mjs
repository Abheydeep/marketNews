// Client-side chart modal renderer supporting multiple timeframes, live chart proxy data fetches, and caching.
export function indicesChartScript() {
  return `<script>
    (function() {
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

      function drawChartSvg(points, meta, cls) {
        const svg = document.getElementById("idx-svg");
        if (!svg) return;
        if (!points || points.length < 2) {
          svg.innerHTML = '<text x="270" y="110" text-anchor="middle" fill="var(--muted-idx)" font-size="14">Chart data unavailable</text>';
          return;
        }

        const color = cls === "idx-pos" ? "#34d399" : cls === "idx-neg" ? "#fb7185" : "#fbbf24";
        const minVal = meta.min;
        const maxVal = meta.max;
        const range = maxVal - minVal || 1e-9;

        const pathPoints = points.map((p, i) => {
          const x = 10 + (i / (points.length - 1)) * 520;
          const y = 205 - ((p.c - minVal) / range) * 190;
          return { x, y };
        });

        const midY = 205 - (0.5 * 190);
        const gridLines = \`
          <line x1="10" y1="15" x2="530" y2="15" stroke="var(--line-idx)" stroke-dasharray="4,4" stroke-width="1" />
          <line x1="10" y1="\${midY}" x2="530" y2="\${midY}" stroke="var(--line-idx)" stroke-dasharray="4,4" stroke-width="1" />
          <line x1="10" y1="205" x2="530" y2="205" stroke="var(--line-idx)" stroke-dasharray="4,4" stroke-width="1" />
        \`;

        const gradId = "grad-" + Math.random().toString(36).substring(2, 8);
        const defs = \`
          <defs>
            <linearGradient id="\${gradId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="\${color}" stop-opacity="0.18"/>
              <stop offset="100%" stop-color="\${color}" stop-opacity="0.00"/>
            </linearGradient>
          </defs>
        \`;

        const pathD = "M " + pathPoints.map(p => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" L ");
        const areaD = pathD + " L " + pathPoints[pathPoints.length - 1].x.toFixed(1) + ",205 L " + pathPoints[0].x.toFixed(1) + ",205 Z";

        const linePath = \`<path d="\${pathD}" fill="none" stroke="\${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />\`;
        const areaPath = \`<path d="\${areaD}" fill="url(#\${gradId})" />\`;

        const lastPt = pathPoints[pathPoints.length - 1];
        const dot = \`<circle cx="\${lastPt.x.toFixed(1)}" cy="\${lastPt.y.toFixed(1)}" r="4.5" fill="#ffffff" stroke="\${color}" stroke-width="3" />\`;

        svg.innerHTML = defs + gridLines + areaPath + linePath + dot;
      }

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
          const res = await fetch("/api/chart?symbol=" + currentSymbol + "&range=" + range);
          if (!res.ok) throw new Error("fetch_failed");
          const data = await res.json();
          if (!data || !data.ok) throw new Error("api_error");

          chartCache[cacheKey] = data;
          if (activeRange === range && currentSymbol === data.symbol) {
            drawChartSvg(data.points, data.meta, currentCls);
            updateStats(data.meta);
          }
        } catch (err) {
          console.error("Failed to load chart range:", err);
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
          console.error("Failed to render preview chart:", err);
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
