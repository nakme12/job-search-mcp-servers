import https from 'https';
import fs from 'fs';

const channels = [
  'merntech',
  'remote_frontend_jobs',
  'freshershunt',
  'offcampusjobs4u',
  'placementlelo',
  'freshersvoice',
  'placement_drive',
  'offcampusdrive',
  'developerjobs',
  'fullstackjobs',
  'remote_jobs_india',
  'freshersopenings',
  'web_development_jobs',
  'hire_developers',
  'techjobsalert',
  'dailytechjobs',
  'jobupdatesindia',
  'react_india',
  'freshersjob'
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ error: 'timeout', html: '' });
    });
  });
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
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function parseChannelPosts(channel, html) {
  const posts = [];
  const messageBlocks = html.split('<div class="tgme_widget_message_wrap');
  for (let i = 1; i < messageBlocks.length; i++) {
    const block = messageBlocks[i];
    
    // Extract date/time
    const timeMatch = block.match(/<time datetime="([^"]+)"/i);
    const dateIso = timeMatch ? timeMatch[1] : null;
    let postDate = dateIso ? dateIso.slice(0, 10) : '2026-10-04';
    
    // Extract message text
    const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (!textMatch) continue;
    
    const rawText = textMatch[1];
    const text = cleanHtml(rawText);
    
    // Extract post link
    const linkMatch = block.match(/href="(https:\/\/t\.me\/[^\/]+\/\d+)"/i);
    const tgPostUrl = linkMatch ? linkMatch[1] : `https://t.me/s/${channel}`;
    
    posts.push({
      channel,
      date: postDate,
      rawDate: dateIso,
      text,
      rawText,
      postUrl: tgPostUrl
    });
  }
  return posts;
}

// Experience & Role validation logic
function evaluatePost(post) {
  const text = post.text;
  const lower = text.toLowerCase();
  
  // Exclude internships, trainees, batches, unpaid, courses
  if (/\b(intern|internship|trainee|training program|batch starts|stipend|bootcamp|course|unpaid)\b/i.test(lower)) {
    return null;
  }
  
  // Exclude React Native, Mobile, Flutter, iOS, Android, DevOps, QA, Data, Java backend only, Python backend only
  if (/\b(react native|flutter|ios developer|android developer|mobile app developer|devops|data scientist|machine learning|qa engineer|tester|automation tester)\b/i.test(lower)) {
    // Only exclude if it's primarily a native/mobile or non-frontend job
    if (!/\b(frontend|react\.js|reactjs|web developer|next\.js|mern)\b/i.test(lower) || /\b(react native|mobile app)\b/i.test(lower)) {
      return null;
    }
  }

  // Seniority exclusion
  if (/\b(senior|lead|architect|principal|staff|manager|director|head of|vp|5\+|6\+|7\+|8\+|10\+)\b/i.test(lower)) {
    return null;
  }
  
  // Check experience: 3+ years, 4+ years, 5+ years exclusion
  const expMatch = lower.match(/(\d+)\s*(?:-|to|\+)\s*(\d+)?\s*(?:years?|yrs?|yoe)/i);
  if (expMatch) {
    const minExp = parseInt(expMatch[1], 10);
    if (minExp >= 3) {
      return null; // 3+ YOE not allowed
    }
  }
  if (/(\b[3-9]\s*\+\s*(?:years?|yrs?|yoe)|3\s*years|4\s*years|5\s*years)/i.test(lower)) {
    return null;
  }

  // Must match target tech stack / roles: React, Frontend, Web Developer, Next.js, MERN, JavaScript Developer, UI Developer
  const isTargetStack = /\b(react|react\.js|reactjs|frontend|front end|front-end|ui developer|web developer|javascript developer|next\.js|nextjs|mern)\b/i.test(lower);
  if (!isTargetStack) {
    return null;
  }

  // Extract email if present
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const email = emailMatch ? emailMatch[1] : '';

  // Extract apply links (exclude generic telegram links if direct link exists)
  const links = [];
  const linkRegex = /(https?:\/\/[^\s\)\"\'\<\>]+)/g;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    const l = match[1];
    if (!l.includes('t.me/') || l === post.postUrl) {
      links.push(l);
    }
  }
  const directLink = links.find(l => !l.includes('t.me/')) || post.postUrl;

  // Extract Company Name
  let company = 'Tech Company';
  const compMatch = text.match(/(?:Company|Hiring at|Hiring for|Organization|Client):\s*([^\n\r,]+)/i) ||
                    text.match(/([A-Z][A-Za-z0-9\s&]{2,25})\s+is hiring/i) ||
                    text.match(/Hiring\s+for\s+([A-Z][A-Za-z0-9\s&]{2,25})/i);
  if (compMatch) {
    company = compMatch[1].trim().replace(/[\*\_\:\-]/g, '').trim();
  }

  // Extract Title
  let title = 'Frontend Developer';
  if (/react(?:\.js|js)?\s+developer/i.test(text)) title = 'React.js Developer';
  else if (/next(?:\.js|js)?\s+developer/i.test(text)) title = 'Next.js Developer';
  else if (/mern(?:\s+stack)?\s+developer/i.test(text)) title = 'MERN Stack Developer';
  else if (/ui(?:\/ux)?\s+developer/i.test(text)) title = 'UI Developer';
  else if (/javascript\s+developer/i.test(text)) title = 'JavaScript Developer';
  else if (/web\s+developer/i.test(text)) title = 'Web Developer';
  else if (/frontend\s+(?:engineer|developer)/i.test(text)) title = 'Frontend Engineer';

  // Extract Location
  let location = 'India / Remote';
  if (/\bindore\b/i.test(text)) location = 'Indore';
  else if (/\bremote\b/i.test(text) || /\bwork from home\b/i.test(text) || /\bwfh\b/i.test(text)) location = 'Remote';
  else if (/\bjaipur\b/i.test(text)) location = 'Jaipur';
  else if (/\bahmedabad\b/i.test(text)) location = 'Ahmedabad';
  else if (/\bbhopal\b/i.test(text)) location = 'Bhopal';
  else if (/\bbangalore\b|\bbengaluru\b/i.test(text)) location = 'Bangalore';
  else if (/\bpune\b/i.test(text)) location = 'Pune';
  else if (/\bhyderabad\b/i.test(text)) location = 'Hyderabad';
  else if (/\bgurgaon\b|\bgurugram\b|\bnoida\b|\bdelhi\b/i.test(text)) location = 'Delhi NCR';

  // Extract Tech Stack
  const techStackList = [];
  if (/react/i.test(text)) techStackList.push('React.js');
  if (/next/i.test(text)) techStackList.push('Next.js');
  if (/typescript/i.test(text)) techStackList.push('TypeScript');
  if (/javascript/i.test(text)) techStackList.push('JavaScript');
  if (/tailwind/i.test(text)) techStackList.push('Tailwind CSS');
  if (/node/i.test(text)) techStackList.push('Node.js');
  if (/redux/i.test(text)) techStackList.push('Redux');
  if (/html|css/i.test(text)) techStackList.push('HTML/CSS');
  if (/rest|api/i.test(text)) techStackList.push('REST APIs');
  const tech_stack = techStackList.length > 0 ? techStackList.join(', ') : 'React.js, JavaScript, HTML/CSS, REST APIs';

  // Experience text
  let experience = '0-2 YOE';
  if (/fresher|0\s*years?|0-1\s*years?/i.test(text)) experience = '0-1 YOE (Fresher / Junior)';
  else if (/1-2\s*years?|1\+?\s*years?/i.test(text)) experience = '1-2 YOE';
  else if (/0-2\s*years?/i.test(text)) experience = '0-2 YOE';

  return {
    company,
    title,
    location,
    posted_date: post.date,
    experience,
    tech_stack,
    url: directLink,
    contact_email: email,
    source: 'Telegram',
    raw_snippet: text.slice(0, 300)
  };
}

async function scrapeAll() {
  console.log('Starting deep Telegram channel sweep...');
  let rawPosts = [];

  for (const ch of channels) {
    console.log(`Scraping channel @${ch}...`);
    let res = await fetchUrl(`https://t.me/s/${ch}`);
    if (res.error || !res.html) {
      await sleep(1000);
      res = await fetchUrl(`https://t.me/s/${ch}`); // retry once
    }
    
    if (res.html) {
      const posts = parseChannelPosts(ch, res.html);
      console.log(`  -> Fetched ${posts.length} posts from @${ch}`);
      rawPosts.push(...posts);
      
      // Let's also check if there's previous page link (before=...)
      const prevMatch = res.html.match(/<link rel="prev" href="\/s\/[^\?]+\?before=(\d+)"/i);
      if (prevMatch) {
        const beforeId = prevMatch[1];
        await sleep(1200);
        const prevRes = await fetchUrl(`https://t.me/s/${ch}?before=${beforeId}`);
        if (prevRes.html) {
          const prevPosts = parseChannelPosts(ch, prevRes.html);
          console.log(`  -> Fetched ${prevPosts.length} previous posts from @${ch}`);
          rawPosts.push(...prevPosts);
        }
      }
    } else {
      console.log(`  -> Failed @${ch} (${res.error || 'empty'})`);
    }
    await sleep(1000);
  }

  console.log(`Total posts scraped across all channels: ${rawPosts.length}`);

  // Deduplicate by text/postUrl
  const seen = new Set();
  const verifiedJobs = [];

  for (const post of rawPosts) {
    const evaluated = evaluatePost(post);
    if (!evaluated) continue;

    // Dedupe
    const key = `${evaluated.company.toLowerCase()}_${evaluated.title.toLowerCase()}_${evaluated.location.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    verifiedJobs.push(evaluated);
  }

  console.log(`Verified 0-2 YOE Tech Jobs matching criteria: ${verifiedJobs.length}`);
  console.log(JSON.stringify(verifiedJobs, null, 2));

  // Write to destination file D:/adi/mcp/stream_b_tg_scraped_fresh.json
  const finalClean = verifiedJobs.map(({ raw_snippet, ...rest }) => rest);
  fs.writeFileSync('D:/adi/mcp/stream_b_tg_scraped_fresh.json', JSON.stringify(finalClean, null, 2));
  console.log('Successfully written to D:/adi/mcp/stream_b_tg_scraped_fresh.json');
}

scrapeAll();
