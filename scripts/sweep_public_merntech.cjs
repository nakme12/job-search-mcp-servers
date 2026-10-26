const fs = require('fs');
const path = require('path');

const TODAY_DATE = '2026-10-26';
const ENGINE_ROOT = path.resolve(__dirname, '..');
const FILE3_PATH = path.join(ENGINE_ROOT, `total_todays_${TODAY_DATE}.json`);
const HIST_PATH = path.join(ENGINE_ROOT, 'total_historical_except_today.json');

async function sweepMernTech() {
  console.log('=================================================================');
  console.log('📡 SWEEPING PUBLIC @merntech (Developer Hub | Jobs & Referrals)');
  console.log('=================================================================');

  // 1. Load Historical Deduplication Set
  const historicalSet = new Set();
  if (fs.existsSync(HIST_PATH)) {
    try {
      const hData = JSON.parse(fs.readFileSync(HIST_PATH, 'utf8'));
      (Array.isArray(hData) ? hData : (hData.jobs || [])).forEach(j => {
        const u = (j.recipient_or_url || j.url || j.recipient || j.applyUrl || '').trim().toLowerCase();
        if (u) historicalSet.add(u);
      });
      console.log(`Loaded ${historicalSet.size} historical keys for deduplication.`);
    } catch (e) {}
  }

  // 2. Load File 3
  let todayPool = { date: TODAY_DATE, total: 0, jobs: [] };
  if (fs.existsSync(FILE3_PATH)) {
    try {
      todayPool = JSON.parse(fs.readFileSync(FILE3_PATH, 'utf8'));
    } catch (e) {}
  }
  const seenToday = new Set(todayPool.jobs.map(j => (j.url || j.recipient || '').trim().toLowerCase()).filter(Boolean));

  // Fetch multiple pages of @merntech (latest + previous page)
  let allHtml = '';
  
  // Page 1 (Latest)
  const res1 = await fetch('https://t.me/s/merntech', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  if (res1.ok) {
    allHtml += await res1.text();
  }

  // Extract min post ID to paginate backwards
  const idMatches = [...allHtml.matchAll(/data-post="merntech\/(\d+)"/g)].map(m => parseInt(m[1]));
  const minId = idMatches.length ? Math.min(...idMatches) : null;

  if (minId) {
    console.log(`Paginating backwards before post #${minId}...`);
    try {
      const res2 = await fetch(`https://t.me/s/merntech?before=${minId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (res2.ok) {
        allHtml += await res2.text();
      }
    } catch(e) {}
  }

  // Extract all message divs
  const messageRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  const rawPosts = [];
  let match;
  while ((match = messageRegex.exec(allHtml)) !== null) {
    rawPosts.push(match[1]);
  }

  console.log(`\nFound ${rawPosts.length} raw message blocks in @merntech history.`);

  let addedLeads = 0;
  let skippedDups = 0;
  let skippedNonStack = 0;

  for (let i = 0; i < rawPosts.length; i++) {
    const raw = rawPosts[i];
    const text = raw
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    if (text.length < 30) continue;

    console.log(`\n-------------------------------------------------------------`);
    console.log(`[POST ${i + 1}/${rawPosts.length}]`);
    console.log(text.substring(0, 160).replace(/\n/g, ' '));

    // Stack check
    const isStack = /react(?!\s*native)|frontend|front-end|mern|next\.?js|web developer|full stack|fullstack/i.test(text);
    const isBanned = /flutter|react native|android|ios|embedded/i.test(text);

    if (!isStack || isBanned) {
      console.log('   ❌ Skipped (Non-Stack / Mobile)');
      skippedNonStack++;
      continue;
    }

    // Extract email or external link
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const linkMatch = text.match(/https?:\/\/[^\s"'<>]+/);
    const email = emailMatch ? emailMatch[0].toLowerCase() : null;
    const link = linkMatch ? linkMatch[0] : null;

    const target = email || link;
    if (!target) {
      console.log('   ❌ Skipped (No email or link found)');
      continue;
    }

    const norm = target.trim().toLowerCase();
    if (historicalSet.has(norm)) {
      console.log(`   ⚠️ Skipped Duplicate (Historical): ${target}`);
      skippedDups++;
      continue;
    }
    if (seenToday.has(norm)) {
      console.log(`   ⚠️ Skipped Duplicate (Already in Today Pool): ${target}`);
      skippedDups++;
      continue;
    }

    // Parse Company, Role, Experience
    let company = 'Tech Company';
    let role = 'Frontend / MERN Developer';
    let exp = '0-2 Years';
    let location = 'India / Remote';

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (const l of lines) {
      if (/company\s*:/i.test(l)) {
        company = l.replace(/.*company\s*:\s*/i, '').replace(/[*_#]/g, '').trim();
      } else if (/hiring\s*:\s*|role\s*:\s*|position\s*:\s*/i.test(l)) {
        role = l.replace(/.*(?:hiring|role|position)\s*:\s*/i, '').replace(/[*_#]/g, '').trim();
      } else if (/experience\s*:/i.test(l)) {
        exp = l.replace(/.*experience\s*:\s*/i, '').replace(/[*_#]/g, '').trim();
      } else if (/location\s*:/i.test(l)) {
        location = l.replace(/.*location\s*:\s*/i, '').replace(/[*_#]/g, '').trim();
      }
    }

    // Experience filter check
    const isHighExp = /\b(6\+|7\+|8\+|9\+|10\+|12\+)\s*(?:years?|yrs?|yoe)/i.test(exp);
    if (isHighExp) {
      console.log(`   ❌ Skipped Out of Range Senior (Experience: ${exp})`);
      continue;
    }

    const newJob = {
      id: todayPool.jobs.length + 1,
      company,
      role,
      location,
      experience_stated: exp,
      url: link || email,
      recipient: email || null,
      channel: email ? 'Direct Recruiter Email' : 'Direct ATS Form',
      source: 'Telegram (@merntech Public)',
      resume_mapped: /mern|full stack|node/i.test(role) ? 'Pratik Patidar Resume - MERN Full Stack.pdf' : 'Pratik Patidar Resume - Frontend Engineer.pdf',
      date_posted: new Date().toISOString(),
      raw_snippet: text.substring(0, 300),
      status: email ? 'READY_FOR_DIRECT_EMAIL' : 'DISCOVERED_PENDING_AUDIT',
      discovered_at: new Date().toISOString()
    };

    todayPool.jobs.push(newJob);
    seenToday.add(norm);
    addedLeads++;
    console.log(`   ✨ [QUALIFIED LEAD INGESTED]: ${company} — ${role} (Exp: ${exp}) [${target}]`);
  }

  todayPool.total = todayPool.jobs.length;
  fs.writeFileSync(FILE3_PATH, JSON.stringify(todayPool, null, 2), 'utf8');

  console.log('\n=================================================================');
  console.log(`🏁 @merntech SWEEP COMPLETE`);
  console.log(`- Total Posts Analyzed: ${rawPosts.length}`);
  console.log(`- Qualified Leads Added: ${addedLeads}`);
  console.log(`- Duplicates Skipped:    ${skippedDups}`);
  console.log(`- File 3 Pool Total:     ${todayPool.total}`);
  console.log('=================================================================\n');
}

sweepMernTech().catch(console.error);
