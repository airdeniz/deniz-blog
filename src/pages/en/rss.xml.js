import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../../config';
import { SITE_DESCRIPTION } from '../../i18n';

export async function GET(context) {
  const posts = (
    await getCollection('blog', ({ id, data }) => !data.draft && id.startsWith('en/'))
  ).sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

  return rss({
    title: SITE.title,
    description: SITE_DESCRIPTION.en,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/en/blog/${post.id.replace(/^en\//, '')}/`,
    })),
    customData: `<language>en</language>`,
  });
}
