// Scoped CSS for the FII/DII page, injected as a <style> block inside the body.
// staticSeoPage has no per-page CSS slot, so everything here is namespaced under
// `.mf` to avoid clashing with the shared page styles.
export function fiiDiiStyles() {
  return `<style>
  .mf{--up:#4fae83;--up-fill:#3c8f6c;--up-bg:rgba(79,174,131,.12);--dn:#d77884;--dn-fill:#b85c68;--dn-bg:rgba(215,120,132,.12);--flat:#94a3b8;--accent:#46adc4;display:grid;gap:26px;margin-bottom:30px}
  .mf > *{min-width:0}
  .mf .pos{color:var(--up)}.mf .neg{color:var(--dn)}.mf .flat{color:var(--flat)}
  .mf-cards{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))}
  .mf-card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 18px;position:relative;overflow:hidden}
  .mf-card::after{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:linear-gradient(90deg,var(--accent),transparent)}
  .mf-card span{color:var(--muted);display:block;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
  .mf-card strong{display:block;font-size:26px;font-weight:850;margin:8px 0 4px;letter-spacing:-.01em}
  .mf-card small{color:var(--muted);font-size:12px;line-height:1.45;display:block}
  .mf-asof{color:var(--muted);font-size:12px;font-weight:800;letter-spacing:.04em}
  .mf-asof b{color:var(--accent)}
  .mf-section-h{font-size:20px;font-weight:850;margin:0 0 4px}
  .mf-section-s{color:var(--muted);font-size:14px;line-height:1.6;margin:0 0 14px;max-width:760px}
  
  .mf-regime{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:99px;font-size:13px;font-weight:800;margin-bottom:4px;letter-spacing:.03em}
  .mf-regime.bearish{background:var(--dn-bg);color:var(--dn);border:1px solid rgba(215,120,132,0.2)}
  .mf-regime.bullish{background:var(--up-bg);color:var(--up);border:1px solid rgba(79,174,131,0.2)}
  .mf-regime.neutral{background:rgba(148,163,184,0.08);color:var(--flat);border:1px solid rgba(148,163,184,0.2)}
  .mf-regime-dot{width:8px;height:8px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}

  .mf-battle{margin:8px 0}
  .mf-battle-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
  .mf-battle-lbl{font-size:11px;font-weight:900;width:30px;flex-shrink:0;letter-spacing:.04em}
  .mf-battle-track{flex:1;height:16px;background:var(--paper);border-radius:99px;overflow:hidden;border:1px solid var(--line);position:relative}
  .mf-battle-track::after{content:"";position:absolute;left:50%;top:0;width:1px;height:100%;background:rgba(255,255,255,0.15);z-index:2}
  .mf-battle-fill{height:100%;border-radius:99px;transition:width .4s}
  .mf-battle-num{font-size:12px;font-weight:850;width:105px;text-align:right;flex-shrink:0}
  .mf-battle-note{font-size:12px;color:var(--muted);padding:6px 0 2px;line-height:1.45}
  .mf-battle-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}

  .mf-gauge-wrap{margin:8px 0}
  .mf-gauge-header{display:flex;justify-content:space-between;font-size:12px;font-weight:850;margin-bottom:6px}
  .mf-gauge-track{height:22px;border-radius:99px;background:var(--paper);overflow:hidden;position:relative;margin-bottom:5px;border:1px solid var(--line)}
  .mf-gauge-track::after{content:"";position:absolute;left:50%;top:0;width:1px;height:100%;background:rgba(255,255,255,0.25);z-index:2}
  .mf-gauge-long{position:absolute;left:0;top:0;height:100%;border-radius:99px 0 0 99px;background:var(--up-fill);transition:width .4s}
  .mf-gauge-short{position:absolute;right:0;top:0;height:100%;border-radius:0 99px 99px 0;background:var(--dn-fill);transition:width .4s}
  .mf-gauge-labels{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);font-weight:800}

  .mf-ann{display:inline-block;font-size:9px;font-weight:900;padding:1px 5px;border-radius:3px;background:var(--accent);color:#04121b;margin-left:4px;vertical-align:middle;text-transform:uppercase;letter-spacing:.05em}

  .mf-chart{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px}
  .mf-chart h3{font-size:14px;font-weight:850;margin:0 0 2px}
  .mf-chart p{color:var(--muted);font-size:12px;margin:0 0 12px}
  .mf-chart svg{width:100%;height:auto;display:block}
  .mf-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:10px;font-size:12px;font-weight:800;color:var(--muted)}
  .mf-legend i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px;vertical-align:-1px}
  .mf-charts{display:grid;gap:16px;grid-template-columns:1fr 1fr}
  .mf-chart--wide{grid-column:1/-1}
  .mf-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
  .mf-tabs input{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
  .mf-tabs label{border:1px solid var(--line);border-radius:9px;color:var(--muted);cursor:pointer;font-size:13px;font-weight:850;min-height:44px;display:inline-flex;align-items:center;padding:8px 14px}
  .mf-panel{display:none}
  .mf-tw{border:1px solid var(--line);border-radius:12px;overflow:hidden}
  #mf-cash:checked~.mf-tabs label[for=mf-cash],
  #mf-idx:checked~.mf-tabs label[for=mf-idx],
  #mf-stk:checked~.mf-tabs label[for=mf-stk]{background:var(--accent);border-color:var(--accent);color:#04121b}
  #mf-cash:checked~.mf-tw .mf-panel.cash,
  #mf-idx:checked~.mf-tw .mf-panel.idx,
  #mf-stk:checked~.mf-tw .mf-panel.stk{display:block}
  
  .mf-tablewrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .mf-table{border-collapse:collapse;width:100%;font-size:13px;min-width:560px}
  .mf-table caption{caption-side:top;text-align:left;color:var(--muted);font-size:12px;font-weight:800;padding:14px 14px 8px;text-transform:uppercase;letter-spacing:.06em}
  .mf-table th,.mf-table td{padding:9px 12px;text-align:right;border-bottom:1px solid var(--line);white-space:nowrap;position:relative;z-index:1}
  .mf-table th:first-child,.mf-table td:first-child{text-align:left;position:sticky;left:0;background:var(--paper);z-index:3}
  .mf-table thead th{color:var(--muted);font-size:11px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;position:sticky;top:0;background:#0a1322;z-index:2}
  .mf-table tbody tr:nth-child(even){background:rgba(255,255,255,0.015)}
  .mf-table tbody tr:hover{background:rgba(70,173,196,.06)}
  .mf-table tfoot td{font-weight:850;border-top:1px solid var(--accent);border-bottom:none;color:#e2e8f0}
  .mf-table .mf-row-missing{opacity:.45}
  
  .mf-bar-bg{position:absolute;top:4px;bottom:4px;right:4px;z-index:-1;border-radius:3px;opacity:0.12;pointer-events:none}
  
  .mf-sub{display:flex;gap:8px;flex-wrap:wrap;padding:12px 12px 0}
  .mf-sub a{border:1px solid var(--line);border-radius:8px;color:var(--muted);font-size:12px;font-weight:800;padding:7px 11px}
  .mf-sub a.on{background:rgba(70,173,196,.14);border-color:var(--accent);color:#cffafe}
  .mf-read{background:linear-gradient(135deg,rgba(70,173,196,.08),rgba(15,23,42,.5));border:1px solid var(--line);border-radius:12px;padding:18px 20px}
  .mf-read h3{font-size:15px;font-weight:850;margin:0 0 12px;display:flex;align-items:center;gap:8px}
  .mf-read h3::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 10px var(--accent)}
  .mf-read ul{margin:0;padding:0;list-style:none;display:grid;gap:10px}
  .mf-read li{color:#dbe4f0;font-size:14px;line-height:1.55;padding-left:20px;position:relative}
  .mf-read li::before{content:"▹";position:absolute;left:0;color:var(--accent)}
  .mf-read b{color:#fff;font-weight:850}
  .mf-note{color:var(--muted);font-size:12px;line-height:1.55;border:1px dashed var(--line);border-radius:10px;padding:12px 14px}
  
  @media (max-width:720px){
    .mf{gap:20px}
    .mf-cards{grid-template-columns:1fr}
    .mf-card strong{font-size:22px}
    .mf-charts{grid-template-columns:1fr}
    .mf-chart svg{min-height:220px}
    .mf-tabs label{flex:1;justify-content:center;padding:8px 6px;font-size:12px}
    .mf-chart--wide{grid-column:auto}
  }
  @media (max-width:480px){
    .mf{gap:16px}
    .mf-card{padding:14px 16px}
  }
  @media (max-width:600px){
    .mf-table, .mf-table thead, .mf-table tbody, .mf-table tr, .mf-table td, .mf-table th {display:block}
    .mf-table{min-width:auto !important}
    .mf-table thead {display:none}
    .mf-table caption {font-size:13px;padding:12px 10px;text-align:center}
    .mf-table tr {border:1px solid var(--line);border-radius:10px;margin-bottom:12px;padding:12px;background:var(--paper)}
    .mf-table td {border:none;padding:6px 0;text-align:right;display:flex;justify-content:space-between;font-size:13px;white-space:normal}
    .mf-table td:first-child {position:static;background:none;font-weight:850;border-bottom:1px solid var(--line);padding-bottom:6px;margin-bottom:6px;font-size:14px}
    .mf-table td::before {content:attr(data-lbl);font-weight:900;color:var(--muted);text-transform:uppercase;font-size:10px;display:inline-block;text-align:left}
    .mf-table tfoot {display:block;margin-top:10px}
    .mf-table tfoot tr {background:var(--panel);border:1px solid var(--accent)}
    .mf-bar-bg {top:2px;bottom:2px;right:2px}
  }
  </style>`;
}
