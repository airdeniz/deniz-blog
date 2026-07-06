// ---------------------------------------------------------------------------
// İki dillilik (i18n) — tek merkez.
//
// Site iki dilde yayınlanır: Türkçe (varsayılan, kök URL'de) ve İngilizce
// (/en/ öneki altında). Yazı slug'ları iki dilde aynıdır; yalnızca route
// öneki değişir. Bu dosya; UI metinlerini, gezinme menüsünü ve dil/yol
// yardımcılarını barındırır.
// ---------------------------------------------------------------------------

export const LOCALES = ['tr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'tr';

// Sitenin dile göre kısa tanıtımı (ana sayfa + meta description).
export const SITE_DESCRIPTION: Record<Locale, string> = {
  tr: 'Veri mühendisliği ve dağıtık sistemler üzerine notlar. Veri ambarlarından modern lakehouse mimarilerine; kaynaktaki veriyi analitik ve makine öğrenmesine taşıyan uçtan uca veri hatları üzerine yazıyorum.',
  en: 'Notes on data engineering and distributed systems. From data warehouses to modern lakehouse architectures; writing about end-to-end data pipelines that carry source data into analytics and machine learning.',
};

// Header gezinme menüsü — dile göre etiket ve hedef.
export const NAV: Record<Locale, { label: string; href: string }[]> = {
  tr: [
    { label: 'Anasayfa', href: '/' },
    { label: 'Yazılar', href: '/blog/' },
    { label: 'Hakkımda', href: '/hakkimda/' },
  ],
  en: [
    { label: 'Home', href: '/en/' },
    { label: 'Posts', href: '/en/blog/' },
    { label: 'About', href: '/en/about/' },
  ],
};

// Arayüzde geçen tüm sabit metinler.
export const UI: Record<Locale, Record<string, string>> = {
  tr: {
    heroGreeting: 'Merhaba, ben',
    heroReadPosts: 'Yazıları oku',
    heroAbout: 'Hakkımda',
    latestPosts: 'Son yazılar',
    seeAll: 'Tümü →',
    noPosts: 'Henüz yazı yok. Yakında burada olacak.',
    postsTitle: 'Yazılar',
    postsAll: 'Tüm blog yazıları',
    totalPosts: 'Toplam {n} yazı',
    emptyList: 'Henüz yazı yok.',
    readMore: 'Devamını oku →',
    backToPosts: '← Tüm yazılar',
    pdfDownload: 'PDF indir',
    pdfPreparing: 'Hazırlanıyor…',
    pdfError: 'PDF oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.',
    updatedOn: 'Son güncelleme:',
    source: 'Kaynak:',
    readingTime: '{n} dk okuma',
    aboutTitle: 'Hakkımda',
    aboutContact: 'İletişim',
    aboutBody:
      'Merhaba, ben {name}. Bu blogda yazılım, veri ve dağıtık sistemler üzerine öğrendiklerimi ve notlarımı paylaşıyorum. Amacım hem kendi öğrenme sürecimi belgelemek hem de aynı konulara ilgi duyanlara faydalı olmak.',
    contactEmail: 'E-posta',
    footerEmail: 'E-posta',
    searchOpen: 'Ara',
    searchTitle: 'Ara ( / )',
    searchPlaceholder: 'Yazılarda ara…',
    searchEmpty: 'Sonuç bulunamadı.',
    searchNav: 'gezin',
    searchOpenResult: 'aç',
    searchClose: 'kapat',
    themeToggle: 'Temayı değiştir',
    langToggleLabel: "English'e geç",
    langToggleText: 'EN',
  },
  en: {
    heroGreeting: "Hi, I'm",
    heroReadPosts: 'Read the posts',
    heroAbout: 'About',
    latestPosts: 'Latest posts',
    seeAll: 'All →',
    noPosts: 'No posts yet. Coming soon.',
    postsTitle: 'Posts',
    postsAll: 'All blog posts',
    totalPosts: '{n} posts in total',
    emptyList: 'No posts yet.',
    readMore: 'Read more →',
    backToPosts: '← All posts',
    pdfDownload: 'Download PDF',
    pdfPreparing: 'Preparing…',
    pdfError: 'Something went wrong while generating the PDF. Please try again.',
    updatedOn: 'Last updated:',
    source: 'Source:',
    readingTime: '{n} min read',
    aboutTitle: 'About',
    aboutContact: 'Contact',
    aboutBody:
      "Hi, I'm {name}. On this blog I share what I learn and my notes on software, data and distributed systems. My aim is both to document my own learning process and to be useful to anyone interested in the same topics.",
    contactEmail: 'Email',
    footerEmail: 'Email',
    searchOpen: 'Search',
    searchTitle: 'Search ( / )',
    searchPlaceholder: 'Search posts…',
    searchEmpty: 'No results found.',
    searchNav: 'navigate',
    searchOpenResult: 'open',
    searchClose: 'close',
    themeToggle: 'Toggle theme',
    langToggleLabel: 'Switch to Turkish',
    langToggleText: 'TR',
  },
};

/** Belirli bir dil için çeviri fonksiyonu. `{n}`, `{name}` gibi yer tutucuları doldurur. */
export function useTranslations(lang: Locale) {
  return (key: string, vars?: Record<string, string | number>): string => {
    let s = UI[lang][key] ?? UI[DEFAULT_LOCALE][key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return s;
  };
}

/** Bir URL yolundan aktif dili çıkarır. /en veya /en/... → 'en', aksi halde 'tr'. */
export function getLocaleFromPath(pathname: string): Locale {
  return /^\/en(\/|$)/.test(pathname) ? 'en' : 'tr';
}

// Slug'ı iki dilde farklı olan sayfalar (çoğu sayfa aynı slug'ı paylaşır).
// Anahtar: TR yolu, değer: EN yolu. Karşılık her iki yönde de aranır.
const SPECIAL_ROUTES: Record<string, string> = {
  '/hakkimda/': '/en/about/',
};

/**
 * Aktif yolun diğer dildeki karşılığını üretir (dil butonu için).
 * Özel eşlemesi olan sayfalar tablodan; gerisi /en önekini ekleyip/atarak çözülür.
 */
export function getAlternatePath(pathname: string): string {
  // Sondaki slash'ı normalize ederek özel tabloda ara (iki yönlü).
  const norm = pathname.endsWith('/') ? pathname : pathname + '/';
  for (const [tr, en] of Object.entries(SPECIAL_ROUTES)) {
    if (norm === tr) return en;
    if (norm === en) return tr;
  }
  if (/^\/en(\/|$)/.test(pathname)) {
    const stripped = pathname.replace(/^\/en/, '');
    return stripped === '' ? '/' : stripped;
  }
  return ('/en' + pathname).replace(/\/{2,}/g, '/');
}
