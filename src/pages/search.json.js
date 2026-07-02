import { getCollection } from 'astro:content';

// Site içi aramanın beslendiği JSON index'i. Her yazının başlık, açıklama,
// etiket ve (markdown'dan arındırılmış) gövde metnini içerir.
export async function GET() {
  const base = import.meta.env.BASE_URL;
  const withBase = (p) => (base + '/' + p).replace(/\/{2,}/g, '/');

  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime()
  );

  const index = posts.map((p) => ({
    title: p.data.title,
    description: p.data.description,
    tags: p.data.tags ?? [],
    url: withBase(`blog/${p.id}/`),
    content: (p.body || '')
      .replace(/```[\s\S]*?```/g, ' ') // kod bloklarını çıkar
      .replace(/[#>*`_|~\-]/g, ' ') // markdown sembollerini temizle
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase(),
  }));

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
}
