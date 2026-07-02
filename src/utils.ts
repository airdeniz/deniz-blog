const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/** 2026-07-02 -> "2 Temmuz 2026" */
export function formatDate(date: Date): string {
  return `${date.getDate()} ${MONTHS_TR[date.getMonth()]} ${date.getFullYear()}`;
}

/** Kaba okuma süresi tahmini (Türkçe için ~200 kelime/dk) */
export function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} dk okuma`;
}

/** Yol birleştirmede çift slash'ı temizler */
export function joinBase(href: string): string {
  const base = import.meta.env.BASE_URL;
  return (base + '/' + href).replace(/\/{2,}/g, '/');
}
