/**
 * src/pages/robots.txt.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { APIRoute } from 'astro';
import { SITE_URL } from '@/data/site';

/**
 * `robots.txt` se genera en el build para que la directiva `Sitemap:` apunte
 * siempre al origen público real (`PUBLIC_SITE_URL`) y no a un dominio fijo.
 */
export const GET: APIRoute = () => {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /demo-file-processor',
    '',
    `Sitemap: ${SITE_URL}/sitemap-index.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
