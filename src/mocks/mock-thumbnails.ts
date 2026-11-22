type ThumbnailGlyph = 'image' | 'play' | 'stack';

function thumbnail(from: string, to: string, glyph: ThumbnailGlyph): string {
  const glyphMarkup =
    glyph === 'play'
      ? `<circle cx="240" cy="180" r="42" fill="#ffffff" fill-opacity="0.2"/>
         <path d="M230 158l38 22-38 22z" fill="#ffffff" fill-opacity="0.92"/>`
      : glyph === 'stack'
        ? `<rect x="160" y="100" width="170" height="150" rx="18" fill="#ffffff" fill-opacity="0.14"/>
           <rect x="185" y="125" width="170" height="150" rx="18" fill="#ffffff" fill-opacity="0.22"/>
           <rect x="210" y="150" width="170" height="150" rx="18" fill="#ffffff" fill-opacity="0.32"/>`
        : `<rect x="150" y="110" width="180" height="140" rx="18" fill="#ffffff" fill-opacity="0.18"/>
           <circle cx="196" cy="152" r="16" fill="#ffffff" fill-opacity="0.6"/>
           <path d="M164 236l52-56 38 38 30-28 38 46z" fill="#ffffff" fill-opacity="0.5"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
    <defs>
      <linearGradient id="base" x1="0" y1="0" x2="480" y2="360" gradientUnits="userSpaceOnUse">
        <stop stop-color="${from}"/>
        <stop offset="1" stop-color="${to}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0" cy="0" r="1" gradientTransform="translate(372 62) rotate(132) scale(190)" gradientUnits="userSpaceOnUse">
        <stop stop-color="#ffffff" stop-opacity="0.5"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="480" height="360" fill="url(#base)"/>
    <circle cx="372" cy="62" r="190" fill="url(#glow)"/>
    <circle cx="70" cy="330" r="160" fill="#000000" fill-opacity="0.12"/>
    <circle cx="430" cy="310" r="90" fill="#000000" fill-opacity="0.08"/>
    ${glyphMarkup}
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const MOCK_THUMBNAILS = {
  studioTour: thumbnail('#6D5BFF', '#C084FC', 'play'),
  goldenHour: thumbnail('#F97316', '#EC4899', 'image'),
  detailShot: thumbnail('#0EA5E9', '#6366F1', 'image'),
  lightingTest: thumbnail('#7C3AED', '#DB2777', 'play'),
  lakeHouse: thumbnail('#0891B2', '#22C55E', 'image'),
  atlasFilm: thumbnail('#1D4ED8', '#38BDF8', 'play'),
  streamPreview: thumbnail('#334155', '#0F172A', 'play'),
  tiktokVideo: thumbnail('#DB2777', '#8B5CF6', 'play'),
  tiktokSlideA: thumbnail('#EC4899', '#F59E0B', 'stack'),
  tiktokSlideB: thumbnail('#06B6D4', '#3B82F6', 'stack'),
  cityWalk: thumbnail('#4F46E5', '#0EA5E9', 'image'),
} as const;
