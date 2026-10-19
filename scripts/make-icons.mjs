// Генерирует иконки PWA, favicon и OG-картинку в public/. Запуск: npm run icons
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const BG = '#0b1020';
const MOON = '#c9d4ff';
const STAR = '#8fa8ff';

// Полумесяц и две звезды в квадрате 512×512. scale < 1 — для maskable (безопасная зона).
function art(scale = 1) {
  const t = `translate(${256 * (1 - scale)} ${256 * (1 - scale)}) scale(${scale})`;
  return `
  <defs>
    <mask id="m">
      <rect width="512" height="512" fill="#fff"/>
      <circle cx="318" cy="200" r="132" fill="#000"/>
    </mask>
  </defs>
  <g transform="${t}">
    <circle cx="236" cy="276" r="156" fill="${MOON}" mask="url(#m)"/>
    <circle cx="352" cy="146" r="16" fill="${STAR}"/>
    <circle cx="410" cy="226" r="10" fill="${STAR}"/>
  </g>`;
}

const icon = (rx) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${rx}" fill="${BG}"/>${art()}</svg>`;
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${BG}"/>${art(0.78)}</svg>`;

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BG}"/>
  <g transform="translate(80 155) scale(0.62)">${art()}</g>
  <text x="440" y="285" font-family="Helvetica, Arial, sans-serif" font-size="76" font-weight="700" fill="#e8ebf7">Калькулятор сна</text>
  <text x="440" y="360" font-family="Helvetica, Arial, sans-serif" font-size="38" fill="#9aa3c0">Во сколько лечь и когда встать,</text>
  <text x="440" y="410" font-family="Helvetica, Arial, sans-serif" font-size="38" fill="#9aa3c0">чтобы проснуться между циклами</text>
  <text x="440" y="500" font-family="Helvetica, Arial, sans-serif" font-size="64" font-weight="700" fill="${STAR}">23:15 → 07:00</text>
</svg>`;

const png = (svg, size, file) => sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(`public/${file}`);

await writeFile('public/favicon.svg', icon(112));
await Promise.all([
  png(icon(112), 32, 'favicon-32.png'),
  png(icon(0), 180, 'apple-touch-icon.png'),
  png(icon(112), 192, 'icon-192.png'),
  png(icon(112), 512, 'icon-512.png'),
  png(maskable, 512, 'icon-maskable-512.png'),
  sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile('public/og.png'),
]);
console.log('icons done');
