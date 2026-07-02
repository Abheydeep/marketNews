import { escapeHtml } from "./html-utils.mjs";

export function liveStatusBadgeHtml({
  id,
  text,
  state = "delayed",
  extraClass = ""
} = {}) {
  const idAttr = id ? ` id="${escapeHtml(id)}"` : "";
  const classes = ["mn-live-badge", state, extraClass].filter(Boolean).join(" ");
  return `<div${idAttr} class="${escapeHtml(classes)}">${escapeHtml(text)}</div>`;
}
