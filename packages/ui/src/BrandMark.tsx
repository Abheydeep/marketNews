export function BrandMark({ size = 40, label = "Market Narrative" }: { size?: number; label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" role="img" aria-label={label}>
      <defs>
        <linearGradient id="ui-mn-bg" x1="10" y1="6" x2="88" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#07111f" />
          <stop offset="0.52" stopColor="#0f172a" />
          <stop offset="1" stopColor="#111827" />
        </linearGradient>
        <linearGradient id="ui-mn-edge" x1="8" y1="8" x2="88" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="0.42" stopColor="#818cf8" />
          <stop offset="0.72" stopColor="#f43f5e" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
        <linearGradient id="ui-mn-stroke" x1="20" y1="30" x2="76" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e0f2fe" />
          <stop offset="0.45" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#a5b4fc" />
        </linearGradient>
        <linearGradient id="ui-mn-signal" x1="18" y1="72" x2="78" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="0.52" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <rect x="7" y="7" width="82" height="82" rx="22" fill="url(#ui-mn-bg)" stroke="url(#ui-mn-edge)" strokeWidth="3" />
      <path d="M24 67V30l15 25 14-25v37" fill="none" stroke="url(#ui-mn-stroke)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M56 67V30l20 37V30" fill="none" stroke="url(#ui-mn-stroke)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.94" />
      <path d="M18 72c11-10 20-5 29-15 8-9 13-18 30-15" fill="none" stroke="url(#ui-mn-signal)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="78" cy="42" r="4.8" fill="#fbbf24" />
    </svg>
  );
}
