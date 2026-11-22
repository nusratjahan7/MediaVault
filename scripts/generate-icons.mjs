import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const sizes = [16, 32, 48, 128];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
      <stop stop-color="#6D6DF0"/>
      <stop offset="1" stop-color="#3B3BB8"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="120" height="120" rx="30" fill="url(#bg)"/>
  <path d="M64 30v38" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>
  <path d="M46 58l18 18 18-18" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="38" y="90" width="52" height="10" rx="5" fill="#FFFFFF" fill-opacity="0.9"/>
</svg>`;

await mkdir('public/icons', { recursive: true });

await Promise.all(
  sizes.map((size) =>
    sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(`public/icons/icon${size}.png`),
  ),
);

console.log(`Generated ${sizes.length} icons in public/icons`);
