import https from 'https';
import fs from 'fs';
import path from 'path';

// Top tech & developer channels
const channels = [
  'merntech',
  'remote_frontend_jobs',
  'freshershunt',
  'placementlelo',
  'freshersvoice',
  'developerjobs',
  'fullstackjobs',
  'remote_jobs_india',
  'freshersopenings',
  'coding_jobs',
  'software_engineering_jobs',
  'web_development_jobs',
  'jobsearchindia',
  'devjobsindia',
  'techjobsalert',
  'react_india',
  'developers_india',
  'hire_developers',
  'tech_jobs_hub',
  'placement_drive',
  'offcampusjobs4u'
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanHtml(raw) {
  return raw
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function fetchUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, html: data }));
    });
    req.on('error', (err) => resolve({ error: err.message, html: '' }));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ error: 'timeout', html: '' });
    });
  });
}

function parseChannelPosts(channel, html) {
  const posts = [];
  const messageBlocks = html.split('<div class="tgme_widget_message_wrap');
  for (let i = 1; i < messageBlocks.length; i++) {
    const block = messageBlocks[i];
    
    // Extract date/time
    const timeMatch = block.match(/<time datetime="([^"]+)"/i);
    const dateIso = timeMatch ? timeMatch[1] : null;
    
    // Extract message text
    const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (!textMatch) continue;
    
    const text = cleanHtml(textMatch[1]).trim();
    if (!text) continue;

    // Extract post link
    const linkMatch = block.match(/href="(https:\/\/t\.me\/[^\/]+\/\d+)"/i);
    const postUrl = linkMatch ? linkMatch[1] : `https://t.me/s/${channel}`;

    posts.push({
      channel,
      dateIso,
      date: dateIso ? dateIso.slice(0, 10) : 'unknown',
      text,
      postUrl
    });
  }
  return posts;
}

// 3 Days cutoff: Oct 10, 2026 onwards
const CUTOFF_TIMESTAMP = new Date('2026-10-10T00:00:00Z').getTime();

async function scrapeAllLast3Days() {
  console.log("=== STEP 1: Scraping ALL raw posts from Telegram channels (Last 3 Days) ===");
  const allRawPosts = [];

  for (const ch of channels) {
    console.log(`Checking channel @${ch}...`);
    // Page 1
    const res = await fetchUrl(`https://t.me/s/${ch}`);
    if (res.html) {
      const posts = parseChannelPosts(ch, res.html);
      allRawPosts.push(...posts);
      
      // Page 2 (older posts if needed)
      const prevMatch = res.html.match(/href="\?before=(\d+)"/i);
      if (prevMatch) {
        await sleep(500);
        const prevRes = await fetchUrl(`https://t.me/s/${ch}?before=${prevMatch[1]}`);
        if (prevRes.html) {
          const prevPosts = parseChannelPosts(ch, prevRes.html);
          allRawPosts.push(...prevPosts);
        }
      }
    }
    await sleep(600);
  }

  console.log(`\nTotal raw posts pulled: ${allRawPosts.length}`);

  // Deduplicate
  const seenPosts = new Set();
  const dedupedRaw = [];
  for (const p of allRawPosts) {
    const key = p.postUrl || p.text.slice(0, 60);
    if (!seenPosts.has(key)) {
      seenPosts.add(key);
      dedupedRaw.push(p);
    }
  }

  // Filter 1: Strictly Last 3 Days (Oct 10, 11, 12, 13)
  const last3DaysPosts = dedupedRaw.filter(p => {
    if (!p.dateIso) return true; // keep if unknown date just in case
    const t = new Date(p.dateIso).getTime();
    return t >= CUTOFF_TIMESTAMP;
  });

  console.log(`Posts from Last 3 Days (Oct 10-13): ${last3DaysPosts.length}`);
  fs.writeFileSync('scripts/tg_last_3_days_raw.json', JSON.stringify(last3DaysPosts, null, 2));

  console.log("\n=== STEP 2: Applying Title & Role Filtering (Frontend / React / MERN / Web Dev) ===");
  // Tech stack keywords
  const titleRegex = /\b(react|react\.js|reactjs|frontend|front\s*end|front-end|ui developer|web developer|next\.js|nextjs|mern|full\s*stack|fullstack|javascript developer)\b/i;
  
  // Non-frontend exclusions (mobile only, devops, qa, data science, non-tech)
  const nonTechExclusion = /\b(flutter only|ios developer|android developer|react native only|devops|data scientist|machine learning|qa tester|automation test|sales|telecaller|bpo)\b/i;

  const stackMatched = last3DaysPosts.filter(p => {
    const t = p.text;
    if (nonTechExclusion.test(t)) return false;
    return titleRegex.test(t);
  });

  console.log(`Posts matching Target Stack & Titles: ${stackMatched.length}`);

  console.log("\n=== STEP 3: Applying Experience Filter (0-2 YOE, Drop 3+ YOE) ===");
  const filteredFinal = [];
  const droppedSenior = [];

  for (const p of stackMatched) {
    const text = p.text;
    const lower = text.toLowerCase();

    // Check if senior
    const isExplicitSenior = /\b(senior|lead|architect|principal|staff|manager|director|vp|5\+|6\+|7\+|8\+|10\+)\b/i.test(lower);
    const expMatch = lower.match(/(\d+)\s*(?:-|to|\+)\s*(\d+)?\s*(?:years?|yrs?|yoe)/i);
    
    let is3Plus = false;
    let expFound = 'Not explicitly stated (Fresher/Open)';

    if (expMatch) {
      const minExp = parseInt(expMatch[1], 10);
      expFound = `${minExp}${expMatch[2] ? '-' + expMatch[2] : '+'} YOE`;
      if (minExp >= 3) {
        is3Plus = true;
      }
    } else if (/\b[3-9]\s*\+\s*(?:years?|yrs?|yoe)/i.test(lower)) {
      is3Plus = true;
      expFound = '3+ YOE';
    } else if (/fresher|junior|0-1|0-2|1-2|entry level|graduate/i.test(lower)) {
      expFound = '0-2 YOE (Fresher/Junior)';
    }

    // Extract email or application link
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
    const linkMatch = text.match(/(https?:\/\/[^\s\)\>]+)/g);

    const record = {
      channel: p.channel,
      date: p.date,
      postUrl: p.postUrl,
      experience: expFound,
      emails: emailMatch || [],
      links: linkMatch || [],
      textSnippet: text.slice(0, 250).replace(/\n/g, ' ')
    };

    if (isExplicitSenior || is3Plus) {
      droppedSenior.push(record);
    } else {
      filteredFinal.push(record);
    }
  }

  console.log(`\n================ SUMMARY ================`);
  console.log(`Total Last 3 Days Raw Posts: ${last3DaysPosts.length}`);
  console.log(`Target Tech/Title Matched: ${stackMatched.length}`);
  console.log(`Dropped (3+ YOE / Senior): ${droppedSenior.length}`);
  console.log(`PASSED 0-2 YOE Tech Jobs: ${filteredFinal.length}`);
  console.log(`=========================================\n`);

  fs.writeFileSync('scripts/tg_filtered_0_2yoe_last3days.json', JSON.stringify(filteredFinal, null, 2));
  fs.writeFileSync('scripts/tg_dropped_seniors_last3days.json', JSON.stringify(droppedSenior, null, 2));

  console.log("Filtered results saved to scripts/tg_filtered_0_2yoe_last3days.json");
}

scrapeAllLast3Days();
