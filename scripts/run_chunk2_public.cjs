const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHUNK_2 = [
  { u: 'freshersvoice', n: 'Freshers Voice' },
  { u: 'placementlelo', n: 'Placement Lelo' },
  { u: 'developerjobs', n: 'Developer Jobs' }
];

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();

  const results = {};

  for (const ch of CHUNK_2) {
    console.log(`\n======================================================`);
    console.log(`📡 SCANNING: @${ch.u} (${ch.n}) via https://t.me/s/${ch.u}`);
    console.log(`======================================================`);

    try {
      await page.goto(`https://t.me/s/${ch.u}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2500));

      const posts = await page.evaluate(() => {
        const bubbles = Array.from(document.querySelectorAll('.tgme_widget_message_text, .js-message_text'));
        return bubbles.map(b => b.innerText ? b.innerText.trim() : '').filter(Boolean);
      });

      console.log(`Extracted ${posts.length} posts from @${ch.u}!`);
      results[ch.u] = posts.slice(-5); // Last 5 posts

    } catch (e) {
      console.log(`Error scanning @${ch.u}: ${e.message}`);
      results[ch.u] = [];
    }
  }

  await page.close();
  await browser.disconnect();

  console.log('\n======================================================');
  console.log('🎯 CHUNK 2 OUTPUT SUMMARY:');
  console.log('======================================================');
  for (const [u, posts] of Object.entries(results)) {
    console.log(`\n>>> CHANNEL: @${u} (Recent Posts: ${posts.length}) <<<`);
    posts.slice(-2).forEach((p, idx) => {
      console.log(`\n[Post ${idx + 1}]`);
      console.log(p.substring(0, 350));
    });
  }
}

run().catch(console.error);
