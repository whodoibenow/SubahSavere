import fs from 'node:fs/promises';

const FEEDS = [
  { id: 'morning-brew', url: 'https://feeds.feedburner.com/morningbrew' },
  { id: 'filter-coffee', url: 'https://filtercoffee.substack.com/feed' },
  { id: 'the-ken', url: 'https://the-ken.com/feed/' },
  { id: 'rundown-ai', url: 'https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml' }
];

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!m) return '';
  return m[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1').trim();
}

function parseRssItems(xml) {
  const items = [];
  const matches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const raw of matches.slice(0, 4)) {
    const title = extractTag(raw, 'title');
    const link = extractTag(raw, 'link');
    const pubDate = extractTag(raw, 'pubDate');
    const encoded = extractTag(raw, 'content:encoded');
    const desc = extractTag(raw, 'description');
    const content = (encoded && encoded.length > desc.length) ? encoded : desc;

    if (content && content.length > 200) {
      items.push({ title, link, pubDate, content });
    }
  }
  return items;
}

async function run() {
  const channels = {};

  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'TodayBriefingBot/1.0 (+personal-reader)' }
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseRssItems(xml);
      if (items.length > 0) {
        channels[feed.id] = {
          updatedAt: new Date().toISOString(),
          items
        };
      }
    } catch (err) {
      console.warn(`Skipped ${feed.id}:`, err.message);
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    channels
  };

  await fs.writeFile('./briefings.json', JSON.stringify(out, null, 2), 'utf8');
  console.log('Saved ./briefings.json for:', Object.keys(channels).join(', '));
}

run();
