import type { Locale } from './i18n';

const MONTHS: Record<Locale, string[]> = {
  tr: [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
};

/** TR: "2 Temmuz 2026" · EN: "July 2, 2026" */
export function formatDate(date: Date, lang: Locale = 'tr'): string {
  const d = date.getDate();
  const m = MONTHS[lang][date.getMonth()];
  const y = date.getFullYear();
  return lang === 'en' ? `${m} ${d}, ${y}` : `${d} ${m} ${y}`;
}

/** Kaba okuma süresi tahmini (~200 kelime/dk). Dile göre etiketlenir. */
export function readingTime(text: string, lang: Locale = 'tr'): string {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return lang === 'en' ? `${minutes} min read` : `${minutes} dk okuma`;
}

/** Yol birleştirmede çift slash'ı temizler */
export function joinBase(href: string): string {
  const base = import.meta.env.BASE_URL;
  return (base + '/' + href).replace(/\/{2,}/g, '/');
}

/** Bir yazının koleksiyon id'sinden dilini çıkarır ('tr/slug' → 'tr'). */
export function postLocale(id: string): Locale {
  return id.startsWith('en/') ? 'en' : 'tr';
}

/** Bir yazının koleksiyon id'sinden dil önekini atıp slug'ı döndürür. */
export function postSlug(id: string): string {
  return id.replace(/^(tr|en)\//, '');
}
