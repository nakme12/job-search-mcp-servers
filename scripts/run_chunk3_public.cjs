const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHUNK_3 = [
  { u: 'freshershunt', n: 'Freshers Hunt' },
  { u: 'fullstackjobs', n: 'Full Stack Jobs' },
  { u: 'coding_jobs', n: 'Coding Jobs' }
];

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();

  const results = {};

  for (const ch of CHUNK_3) {
    try {
      await page.goto(`https://t.me/s/${ch.u}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));

      const posts = await page.evaluate(() => {
        const bubbles = Array.from(document.querySelectorAll('.tgme_widget_message_text, .js-message_text'));
        return bubbles.map(b => b.innerText ? b.innerText.trim() : '').filter(Boolean);
      });

      results[ch.u] = {
        name: ch.n,
        total: posts.length,
        posts: posts.slice(-5)
      };

    } catch (e) {
      results[ch.u] = { name: ch.n, total: 0, posts: [], error: e.message };
    }
  }

  await page.close();
  await browser.disconnect();

  console.log('=== CHUNK 3 RAW RESULT ===');
  for (const [u, data] of Object.entries(results)) {
    console.log(`\n------------------------------------------------------`);
    console.log(`CHANNEL: @${u} (${data.name}) — Total Posts: ${data.total}`);
    if (data.posts.length > 0) {
      data.posts.slice(-2).forEach((p, idx) => {
        console.log(`\n[Sample Post ${idx + 1}]`);
        console.log(p.substring(0, 350));
      });
    } else {
      console.log('No posts found or channel private/dead.');
    }
  }
}

run().catch(console.error);
