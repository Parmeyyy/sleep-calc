import type { APIRoute } from 'astro';
import { absoluteUrl } from '../lib/site';

// На GitHub Pages robots.txt по подпути (/sleep-calc/robots.txt) поисковики не читают —
// он заработает, когда сайт переедет на свой домен в корень. Sitemap можно указать вручную
// в Яндекс.Вебмастере и Google Search Console.
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl('sitemap.xml', site)}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
