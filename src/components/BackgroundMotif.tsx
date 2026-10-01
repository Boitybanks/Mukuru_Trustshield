/**
 * Decorative, low-opacity background: a horizon + city-skyline silhouette and a
 * geometric textile-inspired band, rendered in the Mukuru brand palette.
 *
 * This is deliberately an abstract, generated motif rather than photographic
 * imagery of people or a real place — this build has no way to responsibly
 * source or license photography, so an original geometric/silhouette design
 * is used instead. It is purely decorative: `aria-hidden`, never focusable,
 * and all motion is disabled under `prefers-reduced-motion: reduce`
 * (see src/styles/global.css).
 */
export function BackgroundMotif() {
  return (
    <div className="bg-motif" aria-hidden="true">
      <div className="bg-motif__fill" />
      <svg
        className="bg-motif__layer bg-motif__pattern"
        viewBox="0 0 320 32"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <g key={i} transform={`translate(${i * 32}, 0)`}>
            <polygon points="0,32 16,0 32,32" fill="var(--orange)" />
            <polygon points="8,32 16,16 24,32" fill="var(--charcoal)" />
          </g>
        ))}
      </svg>
      <svg
        className="bg-motif__layer bg-motif__skyline"
        viewBox="0 0 800 220"
        preserveAspectRatio="xMidYMax slice"
        focusable="false"
      >
        <path d="M0,170 Q110,130 230,155 T470,145 T800,160 V220 H0 Z" fill="var(--teal)" />
        <g fill="var(--charcoal)">
          <rect x="40" y="120" width="26" height="90" />
          <rect x="74" y="98" width="20" height="112" />
          <rect x="104" y="138" width="30" height="72" />
          <rect x="150" y="78" width="22" height="132" />
          <rect x="182" y="108" width="18" height="102" />
          <polygon points="210,108 226,66 242,108" />
          <rect x="260" y="128" width="24" height="82" />
          <rect x="300" y="100" width="30" height="110" />
          <rect x="340" y="140" width="20" height="70" />
          <rect x="370" y="116" width="26" height="94" />
        </g>
        <g fill="var(--charcoal)">
          <rect x="642" y="152" width="6" height="52" />
          <ellipse cx="662" cy="142" rx="72" ry="16" />
          <ellipse cx="700" cy="150" rx="44" ry="11" />
        </g>
      </svg>
    </div>
  );
}
