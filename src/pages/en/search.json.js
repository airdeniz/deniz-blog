import { getCollection } from 'astro:content';

// JSON index feeding the English site search. Contains each post's title,
// description, tags and (markdown-stripped) body text.
export async function GET() {
  const base = import.meta.env.BASE_URL;
  const withBase = (p) => (base + '/' + p).replace(/\/{2,}/g, '/');

  const posts = (
    await getCollection('blog', ({ id, data }) => !data.draft && id.startsWith('en/'))
  ).sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

  const index = posts.map((p) => ({
    title: p.data.title,
    description: p.data.description,
    tags: p.data.tags ?? [],
    url: withBase(`en/blog/${p.id.replace(/^en\//, '')}/`),
    content: (p.body || '')
      .replace(/```[\s\S]*?```/g, ' ') // strip code blocks
      .replace(/[#>*`_|~\-]/g, ' ') // strip markdown symbols
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase(),
  }));

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
}
