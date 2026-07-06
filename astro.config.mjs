// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// ---------------------------------------------------------------------------
// Yayın ayarı (Vercel)
//
// `site`, sitemap / RSS / canonical link üretiminde kullanılır.
// Vercel ilk deploy'dan sonra sana bir adres verir (örn. deniz-blog.vercel.app).
// O adresi öğrenince aşağıdaki değeri onunla değiştir. Kendi domain'ini
// bağlarsan onu yaz. (Bu değer build'i bozmaz, sadece SEO linklerini etkiler.)
// ---------------------------------------------------------------------------

export default defineConfig({
  site: 'https://deniz-blog.vercel.app',
  i18n: {
    defaultLocale: 'tr',
    locales: ['tr', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: true,
    },
  },
});
