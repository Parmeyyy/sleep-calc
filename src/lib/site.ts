// Ссылки с учётом base path (GitHub Pages /sleep-calc/ или корень своего домена).
const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

/** url('vo-skolko-...') → '/sleep-calc/vo-skolko-.../' (страницы всегда со слэшем на конце). */
export function url(path = ''): string {
  const clean = path.replace(/^\/+/, '');
  if (!clean) return BASE;
  const isFile = /\.[a-z0-9]+$/i.test(clean);
  return BASE + (isFile || clean.endsWith('/') ? clean : `${clean}/`);
}

export function absoluteUrl(path: string, site: URL | undefined): string {
  if (!site) throw new Error('В astro.config не задан site');
  return new URL(url(path), site).href;
}
