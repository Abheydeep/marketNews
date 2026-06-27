// Scoped CSS for the FII/DII page, injected as a <style> block inside the body.
// staticSeoPage has no per-page CSS slot, so everything here is namespaced under
// `.mf` to avoid clashing with the shared page styles.
export function fiiDiiStyles() {
  return `<style>
  .mf{--up:#34d399;--dn:#fb7185;--flat:#94a3b8;--cyan:#22d3ee;display:grid;gap:26px;margin-bottom:30px}
  .mf .pos{color:var(--up)}.mf .neg{color:var(--dn)}.mf .flat{color:var(--flat)}
  .mf-cards{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
  .mf-card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 18px;position:relative;overflow:hidden}
  .mf-card::after{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,var(--cyan),transparent)}
  .mf-card span{color:var(--muted);display:block;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
  .mf-card strong{display:block;font-size:26px;font-weight:850;margin:8px 0 4px;letter-spacing:-.01em}
  .mf-card small{color:var(--muted);font-size:12px;line-height:1.45;display:block}
  .mf-asof{color:var(--muted);font-size:12px;font-weight:800;letter-spacing:.04em}
  .mf-asof b{color:var(--cyan)}
  .mf-section-h{font-size:20px;font-weight:850;margin:0 0 4px}
  .mf-section-s{color:var(--muted);font-size:14px;line-height:1.6;margin:0 0 14px;max-width:760px}
  .mf-chart{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px}
  .mf-chart h3{font-size:14px;font-weight:850;margin:0 0 2px}
  .mf-chart p{color:var(--muted);font-size:12px;margin:0 0 12px}
  .mf-chart svg{width:100%;height:auto;display:block}
  .mf-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:10px;font-size:12px;font-weight:800;color:var(--muted)}
  .mf-legend i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px;vertical-align:-1px}
  .mf-charts{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
  .mf-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
  .mf-tabs input{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
  .mf-tabs label{border:1px solid var(--line);border-radius:9px;color:var(--muted);cursor:pointer;font-size:13px;font-weight:850;min-height:44px;display:inline-flex;align-items:center;padding:8px 14px}
  .mf-panel{display:none}
  .mf-tw{border:1px solid var(--line);border-radius:12px;overflow:hidden}
  #mf-cash:checked~.mf-tabs label[for=mf-cash],
  #mf-idx:checked~.mf-tabs label[for=mf-idx],
  #mf-stk:checked~.mf-tabs label[for=mf-stk]{background:var(--cyan);border-color:var(--cyan);color:#04121b}
  #mf-cash:checked~.mf-tw .mf-panel.cash,
  #mf-idx:checked~.mf-tw .mf-panel.idx,
  #mf-stk:checked~.mf-tw .mf-panel.stk{display:block}
  .mf-tablewrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .mf-table{border-collapse:collapse;width:100%;font-size:13px;min-width:560px}
  .mf-table caption{caption-side:top;text-align:left;color:var(--muted);font-size:12px;font-weight:800;padding:14px 14px 8px;text-transform:uppercase;letter-spacing:.06em}
  .mf-table th,.mf-table td{padding:9px 12px;text-align:right;border-bottom:1px solid var(--line);white-space:nowrap}
  .mf-table th:first-child,.mf-table td:first-child{text-align:left;position:sticky;left:0;background:var(--paper)}
  .mf-table thead th{color:var(--muted);font-size:11px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;position:sticky;top:0;background:#0a1322}
  .mf-table tbody tr:hover{background:rgba(34,211,238,.06)}
  .mf-table tfoot td{font-weight:850;border-top:1px solid var(--cyan);border-bottom:none;color:#e2e8f0}
  .mf-sub{display:flex;gap:8px;flex-wrap:wrap;padding:12px 12px 0}
  .mf-sub a{border:1px solid var(--line);border-radius:8px;color:var(--muted);font-size:12px;font-weight:800;padding:7px 11px}
  .mf-sub a.on{background:rgba(34,211,238,.14);border-color:var(--cyan);color:#cffafe}
  .mf-read{background:linear-gradient(135deg,rgba(34,211,238,.08),rgba(15,23,42,.5));border:1px solid var(--line);border-radius:12px;padding:18px 20px}
  .mf-read h3{font-size:15px;font-weight:850;margin:0 0 12px;display:flex;align-items:center;gap:8px}
  .mf-read h3::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--cyan);box-shadow:0 0 10px var(--cyan)}
  .mf-read ul{margin:0;padding:0;list-style:none;display:grid;gap:10px}
  .mf-read li{color:#dbe4f0;font-size:14px;line-height:1.55;padding-left:20px;position:relative}
  .mf-read li::before{content:"▹";position:absolute;left:0;color:var(--cyan)}
  .mf-read b{color:#fff;font-weight:850}
  .mf-note{color:var(--muted);font-size:12px;line-height:1.55;border:1px dashed var(--line);border-radius:10px;padding:12px 14px}
  @media (max-width:720px){
    .mf-cards{grid-template-columns:repeat(2,1fr)}
    .mf-card strong{font-size:22px}
    .mf-charts{grid-template-columns:1fr}
    .mf-tabs label{flex:1;justify-content:center;padding:8px 6px;font-size:12px}
  }
  </style>`;
}
