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
