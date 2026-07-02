# Deniz | Blog

Astro ile yapılmış, GitHub Pages üzerinde barınan kişisel teknik blog.

## Geliştirme

```bash
npm install       # bağımlılıkları kur (ilk sefer)
npm run dev       # http://localhost:4321 adresinde canlı önizleme
npm run build     # dist/ klasörüne statik siteyi derle
npm run preview   # derlenmiş siteyi yerelde önizle
```

## Yeni yazı eklemek

`src/content/blog/` klasörüne yeni bir `.md` dosyası ekle. Başına şu bilgileri yaz:

```markdown
---
title: 'Yazı başlığı'
description: 'Kısa açıklama (liste ve SEO için).'
pubDate: 2026-07-10
tags: ['Etiket1', 'Etiket2']
draft: false          # true yaparsan yayınlanmaz
---

Yazı içeriği buraya... (Markdown)
```

Dosya adı, yazının URL'i olur. Örn. `partition-stratejileri.md` -> `/blog/partition-stratejileri/`.

## Kişiselleştirme

- `src/config.ts` — isim, açıklama, e-posta, GitHub/LinkedIn bağlantıları, menü.
- `src/pages/hakkimda.astro` — hakkımda metni.
- `src/styles/global.css` — renkler ve tipografi (`--accent` ana vurgu rengi).

## Vercel ile yayınlama

1. **Repoyu GitHub'a push'la** (aşağıdaki adımlar bir kez yapılır):
   ```bash
   git init
   git add .
   git commit -m "İlk commit: blog"
   git branch -M main
   git remote add origin https://github.com/KULLANICIADI/deniz-blog.git
   git push -u origin main
   ```

2. **[vercel.com](https://vercel.com)** adresine git, **GitHub ile giriş yap**.

3. **"Add New… → Project"** de, blog reposunu seç. Vercel projenin Astro
   olduğunu otomatik tanır; build ayarlarına dokunmana gerek yok. **Deploy**'a bas.

4. Birkaç dakikada `senin-blogun.vercel.app` gibi bir adreste yayında olur.
   Bundan sonra `main` dalına her `git push` otomatik olarak yeni sürümü deploy eder.

5. (Opsiyonel) Vercel adresini öğrenince `astro.config.mjs` içindeki `site`
   değerini onunla güncelle. İstersen Vercel panelinden kendi alan adını da bağlayabilirsin.
