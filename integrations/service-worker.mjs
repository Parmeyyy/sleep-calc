// Генерирует dist/sw.js после сборки: precache всех файлов сайта,
// версия кэша = хэш содержимого, поэтому каждый деплой обновляет кэш.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP = new Set(['sw.js', 'robots.txt', 'sitemap.xml', 'og.png', 'CNAME']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])),
  );
  return files.flat();
}

function swSource(base, version, assets) {
  return `const CACHE = 'sleep-calc-${version}';
const BASE = ${JSON.stringify(base)};
const ASSETS = ${JSON.stringify(assets)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('sleep-calc-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  if (req.mode === 'navigate') {
    // Страницы: сначала сеть (свежий контент), офлайн — из кэша.
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true })
            .then((hit) => hit || caches.match(BASE)),
        ),
    );
    return;
  }

  // Статика: сначала кэш.
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});
`;
}

export default function serviceWorker() {
  let base = '/';
  return {
    name: 'sleep-calc:service-worker',
    hooks: {
      'astro:config:done': ({ config }) => {
        base = config.base.endsWith('/') ? config.base : `${config.base}/`;
      },
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const hash = createHash('sha256');
        const assets = [];
        for (const file of (await walk(root)).sort()) {
          let rel = relative(root, file).split(sep).join('/');
          if (SKIP.has(rel)) continue;
          hash.update(rel).update(await readFile(file));
          if (rel === 'index.html') rel = '';
          else if (rel.endsWith('/index.html')) rel = rel.slice(0, -'index.html'.length);
          assets.push(base + rel);
        }
        const version = hash.digest('hex').slice(0, 12);
        await writeFile(join(root, 'sw.js'), swSource(base, version, assets));
        logger.info(`sw.js: ${assets.length} файлов в precache, версия ${version}`);
      },
    },
  };
}
