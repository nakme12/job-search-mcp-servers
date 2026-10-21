import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { getFilePaths, isDuplicateHistorical, normalizeTargetId } from './workflow_5file_manager.mjs';

const paths = getFilePaths();
const shift1TotalFile = paths.shiftTotal;

let totalShift1 = { date: paths.today, shift: 1, total: 0, jobs: [] };
if (fs.existsSync(shift1TotalFile)) {
  try {
    totalShift1 = JSON.parse(fs.readFileSync(shift1TotalFile, 'utf8'));
    if (!Array.isArray(totalShift1.jobs)) totalShift1.jobs = [];
  } catch (e) {}
}

const seenInShift = new Set(totalShift1.jobs.map(j => normalizeTargetId(j.url || j.applyUrl || j.link || j.recipient || '')));

async function harvestLinkedInLiveStream() {
  console.log("=======================================================");
  console.log("🔍 SLOT 3: HARVESTING LINKEDIN LIVE HIRING POSTS (PAST 24H)");
  console.log("=======================================================");

  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await b.newPage();

  // Search past 24h hiring posts
  const searchUrl = 'https://www.linkedin.com/search/results/content/?keywords=%22Frontend%20Developer%22%20%22hiring%22%20India&sortBy=%22date_posted%22';
  await p.goto(searchUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4500));

  const posts = await p.evaluate(() => {
    const feed = Array.from(document.querySelectorAll('.feed-shared-update-v2, div[data-chameleon-result-urn]'));
    return feed.slice(0, 15).map(f => {
      const text = f.innerText || '';
      const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const links = Array.from(f.querySelectorAll('a')).map(a => a.href).filter(h => h.includes('/in/') || h.includes('/company/'));
      return {
        text: text.slice(0, 400).replace(/\n+/g, ' '),
        emails: emailMatches,
        profileUrl: links[0] || ''
      };
    });
  });

  console.log(`Scraped ${posts.length} live hiring posts from LinkedIn.`);
  await p.close();
  b.disconnect();

  let added = 0;
  for (const post of posts) {
    const text = post.text;
    if (!/\b(frontend|react|next\.?js|web developer|ui developer)\b/i.test(text)) continue;
    if (/\b(senior|lead|principal|architect|manager)\b/i.test(text)) continue;

    const validEmail = post.emails.find(e => !e.includes('gmail') && !e.includes('yahoo'));
    const identifier = validEmail || post.profileUrl;
    if (!identifier) continue;

    const norm = normalizeTargetId(identifier);
    if (seenInShift.has(norm)) continue;
    seenInShift.add(norm);

    if (isDuplicateHistorical(norm)) continue;

    const entry = {
      id: totalShift1.jobs.length + 1,
      company: "LinkedIn Recruiter Lead",
      role: text.slice(0, 80),
      location: "India / Remote",
      url: post.profileUrl,
      recipient: validEmail || null,
      source: "LinkedIn Live Posts (Past 24h)",
      status: "DISCOVERED_PENDING_AUDIT",
      discovered_at: new Date().toISOString()
    };
    totalShift1.jobs.push(entry);
    added++;
    console.log(`[SLOT 3 LINKEDIN] + ${text.slice(0, 60)} -> ${identifier}`);
  }

  totalShift1.total = totalShift1.jobs.length;
  fs.writeFileSync(shift1TotalFile, JSON.stringify(totalShift1, null, 2), 'utf8');
  fs.writeFileSync(paths.todayTotal, JSON.stringify(totalShift1, null, 2), 'utf8');

  console.log(`\n✅ Added ${added} clean LinkedIn live leads to today's raw pool.`);
}

harvestLinkedInLiveStream().catch(console.error);
