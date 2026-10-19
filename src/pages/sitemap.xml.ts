import type { APIRoute } from 'astro';
import { ARTICLES } from '../data/pages';
import { TIME_PAGES, slugFor } from '../data/time-pages';
import { absoluteUrl } from '../lib/site';

export const GET: APIRoute = ({ site }) => {
  const paths = ['', ...ARTICLES.map((a) => `${a.path}/`), ...TIME_PAGES.map((p) => `${slugFor(p)}/`)];
  const urls = paths
    .map((p) => `  <url><loc>${absoluteUrl(p, site)}</loc><priority>${p ? '0.8' : '1.0'}</priority></url>`)
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
