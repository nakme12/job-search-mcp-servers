import https from 'https';
import fs from 'fs';
import path from 'path';

const channels = [
  'merntech',
  'remote_frontend_jobs',
  'freshershunt',
  'offcampusjobs4u',
  'placementlelo',
  'freshersvoice',
  'techgigjobs',
  'dailyjobupdates',
  'offcampusdrive',
  'developerjobs',
  'fullstackjobs',
  'remote_jobs_india',
  'freshersopenings',
  'coding_jobs',
  'software_engineering_jobs',
  'web_development_jobs',
  'jobsearchindia',
  'devjobsindia',
  'freshersjob',
  'techjobsalert',
  'fresher_engineer_jobs',
  'dailytechjobs',
  'react_india',
  'developers_india',
  'hire_developers',
  'tech_jobs_hub',
  'india_jobs_alert',
  'fresherengineers',
  'jobupdatesindia',
  'placement_drive'
];

function fetchChannel(channel) {
  return new Promise((resolve) => {
    const url = `https://t.me/s/${channel}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ channel, html: data }));
    });
    req.on('error', (err) => resolve({ channel, error: err.message, html: '' }));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ channel, error: 'timeout', html: '' });
    });
  });
}

function cleanHtml(raw) {
  return raw
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseChannelPosts(channel, html) {
  const posts = [];
  // Each post widget: class="tgme_widget_message_wrap ...
  const messageBlocks = html.split('<div class="tgme_widget_message_wrap');
  for (let i = 1; i < messageBlocks.length; i++) {
    const block = messageBlocks[i];
    
    // Extract date/time
    // <time datetime="2026-10-04T12:34:56+00:00" class="time">...
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
      postUrl: tgPostUrl
    });
  }
  return posts;
}

async function run() {
  console.log('Fetching channels...');
  const results = await Promise.all(channels.map(fetchChannel));
  
  let allPosts = [];
  for (const res of results) {
    if (res.html) {
      const posts = parseChannelPosts(res.channel, res.html);
      console.log(`Channel @${res.channel}: found ${posts.length} posts`);
      allPosts.push(...posts);
    } else {
      console.log(`Channel @${res.channel}: failed / empty (${res.error || 'unknown'})`);
    }
  }

  console.log(`Total raw posts collected: ${allPosts.length}`);
  fs.writeFileSync('D:/adi/mcp/scripts/raw_tg_posts.json', JSON.stringify(allPosts, null, 2));
}

run();
