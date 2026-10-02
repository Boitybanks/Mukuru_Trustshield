/**
 * Decorative cultural background layer.
 *
 * Photography is intentionally low-opacity and non-interactive. The product
 * UI remains the focus, while the imagery celebrates African people, cities
 * and landscapes. See docs/VISUAL_ASSETS.md for sources/licenses.
 */
export function BackgroundMotif() {
  return (
    <div className="bg-motif" aria-hidden="true">
      <div className="bg-motif__photo bg-motif__photo--joburg" />
      <div className="bg-motif__photo bg-motif__photo--family" />
      <div className="bg-motif__photo bg-motif__photo--maputo" />
      <div className="bg-motif__wash" />
      <svg className="bg-motif__layer bg-motif__pattern" viewBox="0 0 320 32" preserveAspectRatio="xMidYMid slice" focusable="false">
        {Array.from({ length: 10 }).map((_, i) => (
          <g key={i} transform={`translate(${i * 32}, 0)`}>
            <polygon points="0,32 16,0 32,32" fill="var(--orange)" />
            <polygon points="8,32 16,16 24,32" fill="var(--charcoal)" />
          </g>
        ))}
      </svg>
      <svg className="bg-motif__layer bg-motif__skyline" viewBox="0 0 800 220" preserveAspectRatio="xMidYMax slice" focusable="false">
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
        </g>
      </svg>
    </div>
  );
}
