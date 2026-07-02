export function siteThemeCss() {
  return `/* site-theme v1 */
:root {
  --bg: #050816;
  --panel: #0b1120;
  --surface: #0f172a;
  --ink: #f8fafc;
  --muted: #94a3b8;
  --line: rgba(148, 163, 184, 0.22);
  --accent: #22d3ee;
  --up-idx: #34d399;
  --down-idx: #fb7185;
  --flat-idx: #94a3b8;
  --up: #34d399;
  --down: #fb7185;
  --flat: #94a3b8;
  --amber: #fbbf24;
  --paper: var(--bg);
  --blue: var(--accent);
  --cyan: var(--accent);
  --green: var(--up);
  --red: var(--down);
  --gold: var(--amber);
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --content-max: 1160px;
  --content-gutter: 36px;
}

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans);
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  color: var(--accent);
  text-decoration: none;
  transition: color 150ms ease;
}

a:hover {
  filter: brightness(1.1);
}

img, svg {
  max-width: 100%;
  height: auto;
  display: block;
}

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.site-content-shell {
  margin: 0 auto;
  width: min(var(--content-max), calc(100% - var(--content-gutter)));
}

.mn-live-badge {
  align-items: center;
  background: rgba(148, 163, 184, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  color: var(--muted);
  display: inline-flex;
  font-size: 11px;
  font-weight: 850;
  gap: 6px;
  letter-spacing: 0.05em;
  line-height: 1.2;
  padding: 5px 10px;
  text-transform: uppercase;
  width: fit-content;
}

.mn-live-badge.live {
  background: rgba(52, 211, 153, 0.1);
  border-color: rgba(52, 211, 153, 0.24);
  color: var(--up);
}

.mn-live-badge.closed {
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(148, 163, 184, 0.22);
  color: var(--flat);
}

.mn-live-badge.delayed {
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.22);
  color: var(--amber);
}

.mn-live-badge.offline {
  background: rgba(251, 113, 133, 0.1);
  border-color: rgba(251, 113, 133, 0.22);
  color: var(--down);
}

.mn-skip {
  background: var(--ink);
  border-radius: 0 0 8px 0;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  color: var(--bg);
  font-weight: 800;
  height: 1px;
  left: 0;
  overflow: hidden;
  padding: 10px 14px;
  position: fixed;
  top: 0;
  transform: translateY(-120%);
  transition: transform 120ms ease;
  white-space: nowrap;
  width: 1px;
  z-index: 300;
}

.mn-skip:focus,
.mn-skip:focus-visible {
  clip: auto;
  clip-path: none;
  height: auto;
  overflow: visible;
  transform: translateY(0);
  width: auto;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-delay: -1ms !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    background-attachment: initial !important;
    scroll-behavior: auto !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
}
`;
}
