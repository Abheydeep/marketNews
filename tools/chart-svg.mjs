/**
 * Shared SVG Chart and Sparkline Path Generator.
 * Respects ESM and the 200-line budget constraint.
 */

export function mapPointsToSvgCoords(points, { padLeft = 0, width = 100, yZero = 36, yHeight = 30 } = {}) {
  const closes = (points || [])
    .map((p) => (typeof p === "object" ? Number(p.close ?? p.c) : Number(p)))
    .filter(Number.isFinite);

  if (closes.length < 2) return null;

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1e-9;

  const pathPoints = closes.map((val, i) => {
    const x = padLeft + (i / (closes.length - 1)) * width;
    const y = yZero - ((val - min) / range) * yHeight;
    return { x, y };
  });

  return {
    pathPoints,
    min,
    max,
    last: closes.at(-1)
  };
}

export function buildSparklinePath(points, cls) {
  const coords = mapPointsToSvgCoords(points, { padLeft: 0, width: 100, yZero: 34, yHeight: 30 });
  if (!coords) {
    return `<line x1="0" y1="18" x2="100" y2="18" stroke="var(--line-idx)" stroke-width="1.5" />`;
  }

  const pathPointsStr = coords.pathPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
  const strokeColor = cls === "idx-pos" ? "var(--up-idx)" : cls === "idx-neg" ? "var(--down-idx)" : "var(--flat-idx)";
  
  return `<path d="M ${pathPointsStr} L 100,36 L 0,36 Z" fill="${strokeColor}" opacity="0.05" /><path d="M ${pathPointsStr}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />`;
}

/**
 * Returns a client-side script function that can draw SVGs on the client using the unified mapping math.
 */
export function chartClientScript() {
  return `
    function mapPointsToSvgCoords(points, options) {
      const padLeft = options.padLeft || 0;
      const width = options.width || 100;
      const yZero = options.yZero || 36;
      const yHeight = options.yHeight || 30;

      const closes = (points || [])
        .map(p => (typeof p === "object" ? Number(p.close ?? p.c) : Number(p)))
        .filter(Number.isFinite);

      if (closes.length < 2) return null;

      const min = Math.min(...closes);
      const max = Math.max(...closes);
      const range = max - min || 1e-9;

      const pathPoints = closes.map((val, i) => {
        const x = padLeft + (i / (closes.length - 1)) * width;
        const y = yZero - ((val - min) / range) * yHeight;
        return { x, y };
      });

      return { pathPoints, min, max, last: closes[closes.length - 1] };
    }
  `;
}

export function chartClientSparklineScript() {
  return `
    function drawSparklineSvg(svgEl, sparkData, cls) {
      if (!svgEl) return;
      const coords = mapPointsToSvgCoords(sparkData, { padLeft: 0, width: 100, yZero: 34, yHeight: 30 });
      if (!coords) {
        svgEl.innerHTML = '<line x1="0" y1="18" x2="100" y2="18" stroke="var(--line-idx)" stroke-width="1.5" />';
        return;
      }
      const pathPointsStr = coords.pathPoints.map(p => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" L ");
      const strokeColor = cls === "idx-pos" ? "var(--up-idx)" : cls === "idx-neg" ? "var(--down-idx)" : "var(--flat-idx)";
      svgEl.innerHTML = '<path d="M ' + pathPointsStr + ' L 100,36 L 0,36 Z" fill="' + strokeColor + '" opacity="0.05" /><path d="M ' + pathPointsStr + '" fill="none" stroke="' + strokeColor + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />';
    }
  `;
}

export function chartClientDrawScript() {
  return `
    function drawChartSvg(points, meta, cls) {
      const svg = document.getElementById("idx-svg");
      if (!svg) return;
      if (!points || points.length < 2) {
        svg.innerHTML = '<text x="270" y="110" text-anchor="middle" fill="var(--muted-idx)" font-size="14">Chart data unavailable</text>';
        return;
      }

      const color = cls === "idx-pos" ? "#34d399" : cls === "idx-neg" ? "#fb7185" : "#fbbf24";
      const coords = mapPointsToSvgCoords(points, { padLeft: 10, width: 520, yZero: 205, yHeight: 190 });
      if (!coords) {
        svg.innerHTML = '<text x="270" y="110" text-anchor="middle" fill="var(--muted-idx)" font-size="14">Chart data unavailable</text>';
        return;
      }

      const pathPoints = coords.pathPoints;
      const midY = 205 - (0.5 * 190);
      const gridLines = \`
        <line x1="10" y1="15" x2="530" y2="15" stroke="var(--line-idx)" stroke-dasharray="4,4" stroke-width="1" />
        <line x1="10" y1="\${midY}" x2="\${midY}" stroke="var(--line-idx)" stroke-dasharray="4,4" stroke-width="1" />
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
  `;
}

