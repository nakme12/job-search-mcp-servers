const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const REMAINING_CHANNELS = [
  { u: 'software_engineering_jobs', n: 'Software Engineering Jobs' },
  { u: 'web_development_jobs', n: 'Web Development Jobs' },
  { u: 'hire_developers', n: 'Hire Developers Hub' },
  { u: 'techjobsalert', n: 'Tech Jobs Alert' },
  { u: 'react_india', n: 'React India Jobs' },
  { u: 'placement_drive', n: 'Placement Drive' },
  { u: 'remote_jobs_india', n: 'Remote Jobs India' },
  { u: 'freshersopenings', n: 'Freshers Openings' },
  { u: 'jobsearchindia', n: 'Job Search India' },
  { u: 'devjobsindia', n: 'Dev Jobs India' },
  { u: 'developers_india', n: 'Developers India' },
  { u: 'tech_jobs_hub', n: 'Tech Jobs Hub' }
];

async function scanAllRemaining() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();

  const report = [];

  for (let i = 0; i < REMAINING_CHANNELS.length; i++) {
    const ch = REMAINING_CHANNELS[i];
    const url = `https://t.me/s/${ch.u}`;
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 1500));

      const data = await page.evaluate(() => {
        const titleEl = document.querySelector('.tgme_channel_info_header_title');
        const countEl = document.querySelector('.tgme_channel_info_counter');
        const bubbles = Array.from(document.querySelectorAll('.tgme_widget_message_text, .js-message_text'));
        const texts = bubbles.map(b => b.innerText ? b.innerText.trim() : '').filter(Boolean);

        return {
          title: titleEl ? titleEl.innerText.trim() : 'NOT_FOUND',
          subscribers: countEl ? countEl.innerText.trim() : '0',
          totalPosts: texts.length,
          lastPost: texts.length > 0 ? texts[texts.length - 1].slice(0, 200) : ''
        };
      });

      const isDead = data.totalPosts === 0 || data.title === 'NOT_FOUND' || data.lastPost.includes('Channel created') || data.lastPost.includes('username');
      const status = isDead ? 'DROP' : 'KEEP';

      report.push({
        num: i + 10,
        username: ch.u,
        name: data.title !== 'NOT_FOUND' ? data.title : ch.n,
        totalPosts: data.totalPosts,
        status: status,
        lastPostSnippet: data.lastPost.replace(/\n/g, ' ')
      });

    } catch (e) {
      report.push({
        num: i + 10,
        username: ch.u,
        name: ch.n,
        totalPosts: 0,
        status: 'DROP',
        lastPostSnippet: `ERROR: ${e.message}`
      });
    }
  }

  await page.close();
  await browser.disconnect();

  fs.writeFileSync('C:/mcp/job-search-mcp-engine/scripts/tg_remaining_scan_report.json', JSON.stringify(report, null, 2));

  console.log('\n=============================================================');
  console.log('📋 COMPLETE TELEGRAM CHANNELS 10 TO 21 AUDIT REPORT');
  console.log('=============================================================');
  report.forEach(r => {
    const icon = r.status === 'KEEP' ? '✅ KEEP' : '❌ DROP';
    console.log(`[${r.num}] @${r.username.padEnd(25)} | Posts: ${String(r.totalPosts).padStart(2)} | ${icon}`);
    if (r.status === 'KEEP' && r.lastPostSnippet) {
      console.log(`     Last Post: ${r.lastPostSnippet.substring(0, 100)}...`);
    }
  });
}

scanAllRemaining().catch(console.error);
