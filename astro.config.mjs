import { defineConfig } from 'astro/config';
import { SITE_URL } from './site.config.mjs';
import serviceWorker from './integrations/service-worker.mjs';

const url = new URL(SITE_URL);

export default defineConfig({
  site: url.origin,
  base: url.pathname,
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'always',
  },
  integrations: [serviceWorker()],
});
