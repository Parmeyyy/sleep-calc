import type { APIRoute } from 'astro';
import { SITE_NAME } from '../../site.config.mjs';
import { url } from '../lib/site';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: SITE_NAME,
      short_name: 'Сон',
      description: 'Во сколько лечь и когда встать, чтобы проснуться между циклами сна',
      lang: 'ru',
      start_url: url(),
      scope: url(),
      id: url(),
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#0b1020',
      theme_color: '#0b1020',
      icons: [
        { src: url('icon-192.png'), sizes: '192x192', type: 'image/png' },
        { src: url('icon-512.png'), sizes: '512x512', type: 'image/png' },
        { src: url('icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }),
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
