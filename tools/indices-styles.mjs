// Scoped CSS for the Indices and GIFT Nifty pages, namespaced under `.idx` to avoid clashing.
export function indicesStyles() {
  return `<style>
  .idx { --bg-idx: var(--bg); --panel-idx: var(--panel); --panel-2-idx: var(--surface); --line-idx: var(--line); --text-idx: var(--ink); --muted-idx: var(--muted); --up-idx: var(--up); --down-idx: var(--down); --flat-idx: var(--flat); --cyan-idx: var(--accent); display: grid; gap: 24px; margin-bottom: 40px; }
  .idx-live-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: var(--up-idx); background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.2); padding: 4px 10px; border-radius: 99px; width: fit-content; margin-bottom: -12px; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.3s ease; }
  .idx-live-badge.offline { color: var(--down-idx); background: rgba(251, 113, 133, 0.1); border-color: rgba(251, 113, 133, 0.2); }
  .idx-spotlight { background: linear-gradient(135deg, rgba(11, 18, 32, 0.95), rgba(17, 24, 39, 0.85)); border: 1px solid var(--cyan-idx); box-shadow: 0 0 20px rgba(103, 232, 249, 0.1); border-radius: 12px; padding: 24px; position: relative; overflow: hidden; }
  .idx-spotlight::before { content: "SPOTLIGHT"; position: absolute; top: 12px; right: 16px; font-size: 9px; font-weight: 900; color: var(--cyan-idx); letter-spacing: 0.15em; background: rgba(103, 232, 249, 0.1); padding: 2px 6px; border-radius: 4px; }
  .idx-spotlight h3 { margin: 0 0 8px; font-size: 14px; color: var(--muted-idx); text-transform: uppercase; letter-spacing: 0.08em; }
  .idx-spotlight-price { display: flex; align-items: baseline; gap: 12px; margin-bottom: 16px; }
  .idx-spotlight-price strong { font-size: 38px; font-weight: 900; letter-spacing: -0.02em; }
  .idx-spotlight-price span { font-size: 16px; font-weight: 800; }
  .idx-spotlight-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; border-top: 1px solid var(--line-idx); padding-top: 16px; }
  .idx-meta-item span { display: block; font-size: 11px; color: var(--muted-idx); text-transform: uppercase; margin-bottom: 4px; }
  .idx-meta-item strong { font-size: 14px; font-weight: 800; }
  .idx-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
  .idx-card { background: rgba(11, 18, 32, 0.6); border: 1px solid var(--line-idx); border-radius: 8px; padding: 16px; text-decoration: none; color: inherit; transition: all 0.2s ease; cursor: pointer; text-align: left; display: flex; flex-direction: column; justify-content: space-between; min-height: 140px; }
  .idx-card:hover { border-color: var(--cyan-idx); transform: translateY(-2px); }
  .idx-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .idx-card-top small { font-size: 10px; color: var(--muted-idx); font-weight: 900; letter-spacing: 0.05em; }
  .idx-card-top strong { font-size: 16px; font-weight: 850; }
  .idx-card-change { font-size: 14px; font-weight: 800; }
  .idx-spark { width: 100%; height: 48px; margin: 8px 0; }
  .idx-spark path.line { fill: none; stroke-width: 2; }
  .idx-spark path.area { opacity: 0.08; }
  .idx-card-bottom { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted-idx); }
  .idx-vix { background: var(--panel-idx); border: 1px solid var(--line-idx); border-radius: 12px; padding: 20px; }
  .idx-vix-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .idx-vix-head h3 { margin: 0; font-size: 14px; text-transform: uppercase; color: var(--muted-idx); }
  .idx-vix-track { height: 10px; background: linear-gradient(90deg, #34d399 0%, #fbbf24 40%, #f97316 70%, #fb7185 100%); border-radius: 99px; position: relative; margin: 16px 0 8px; }
  .idx-vix-pin { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 14px; height: 14px; background: #ffffff; border: 2px solid var(--bg-idx); border-radius: 50%; box-shadow: 0 0 8px rgba(255, 255, 255, 0.8); transition: left 0.3s ease; }
  .idx-vix-labels { display: flex; justify-content: space-between; font-size: 10px; color: var(--muted-idx); font-weight: 800; position: relative; }
  .idx-clocks { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-top: 8px; }
  .idx-clock { background: rgba(11, 18, 32, 0.4); border: 1px solid var(--line-idx); border-radius: 6px; padding: 10px 12px; text-align: center; }
  .idx-clock span { display: block; font-size: 10px; color: var(--muted-idx); text-transform: uppercase; margin-bottom: 4px; }
  .idx-clock strong { font-size: 13px; font-weight: 850; }
  .idx-clock-pill { display: inline-block; font-size: 9px; font-weight: 900; padding: 1px 6px; border-radius: 4px; margin-top: 6px; }
  .idx-clock-pill.open { background: rgba(52, 211, 153, 0.15); color: var(--up-idx); }
  .idx-clock-pill.closed { background: rgba(251, 113, 133, 0.15); color: var(--down-idx); }
  .idx-ticker-strip { background: #0b1220; border-bottom: 1px solid var(--line-idx); overflow: hidden; white-space: nowrap; padding: 8px 0; font-size: 12px; font-weight: 800; cursor: pointer; }
  .idx-ticker-strip:hover .idx-ticker-wrap { animation-play-state: paused; }
  .idx-ticker-wrap { display: inline-block; animation: idxMarquee 25s linear infinite; }
  .idx-ticker-item { display: inline-flex; align-items: center; gap: 6px; margin-right: 28px; }
  .idx-ticker-item span { color: var(--muted-idx); }
  @keyframes idxMarquee { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-50%, 0, 0); } }
  .idx-flash-up { animation: idxFlashUp 0.6s ease-out; }
  .idx-flash-down { animation: idxFlashDown 0.6s ease-out; }
  @keyframes idxFlashUp { 0% { background-color: rgba(52, 211, 153, 0.25); } 100% { background-color: transparent; } }
  @keyframes idxFlashDown { 0% { background-color: rgba(251, 113, 133, 0.25); } 100% { background-color: transparent; } }
  .idx-calc { background: var(--panel-idx); border: 1px solid var(--line-idx); border-radius: 12px; padding: 20px; }
  .idx-calc-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed var(--line-idx); }
  .idx-calc-row:last-child { border-bottom: none; padding-bottom: 0; }
  .idx-calc-row:first-child { padding-top: 0; }
  .idx-calc-val { font-weight: 850; font-size: 15px; }
  .idx-table-wrap { width: 100%; overflow-x: auto; border: 1px solid var(--line-idx); border-radius: 12px; background: var(--panel-idx); }
  .idx-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
  .idx-table th, .idx-table td { padding: 12px 16px; border-bottom: 1px solid var(--line-idx); }
  .idx-table th { font-size: 11px; font-weight: 900; color: var(--muted-idx); text-transform: uppercase; letter-spacing: 0.05em; background: var(--panel-2-idx); }
  .idx-table tr:last-child td { border-bottom: none; }
  .idx-pos { color: var(--up-idx); }
  .idx-neg { color: var(--down-idx); }
  .idx-flat { color: var(--flat-idx); }
  
  /* Heatmap custom weights based on dataset classes */
  .idx-heat-bg-pos-1 { background: rgba(52, 211, 153, 0.08); }
  .idx-heat-bg-pos-2 { background: rgba(52, 211, 153, 0.16); }
  .idx-heat-bg-pos-3 { background: rgba(52, 211, 153, 0.24); }
  .idx-heat-bg-neg-1 { background: rgba(251, 113, 133, 0.08); }
  .idx-heat-bg-neg-2 { background: rgba(251, 113, 133, 0.16); }
  .idx-heat-bg-neg-3 { background: rgba(251, 113, 133, 0.24); }
  
    .shell { width: min(1160px, calc(100% - 32px)); margin: 0 auto; }
    .idx-layout-shell { width: min(1160px, calc(100% - 32px)); margin: 0 auto; }
    .idx-layout-hero { padding: 46px 0 26px; }
    .idx-layout-eyebrow { margin: 0 0 10px; color: var(--accent); font-size: 12px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
    .idx-layout-h1 { margin: 0; max-width: 780px; font-size: clamp(34px, 5vw, 64px); line-height: 1.02; letter-spacing: 0; }
    .idx-layout-hero-p { max-width: 760px; color: #cbd5e1; font-size: 17px; line-height: 1.7; }
    .idx-layout-footer-note { margin: 38px 0 46px; padding-top: 18px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; line-height: 1.6; }
    @media (max-width: 760px) {
      .idx-grid { grid-template-columns: 1fr; }
      .idx-spotlight-price strong { font-size: 30px; }
      .idx-ticker-strip { display: none; }
      .idx-layout-hero { padding: 30px 0 18px; }
      .idx-layout-footer-note { margin-bottom: 84px; }
    }
  </style>`;
}
