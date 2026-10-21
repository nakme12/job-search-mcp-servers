import https from 'https';
import fs from 'fs';
import path from 'path';

// All discovered tech and job telegram channels
const tgChannels = [
  'merntech',
  'remote_frontend_jobs',
  'placementlelo',
  'developerjobs',
  'freshershunt',
  'offcampusjobs4u',
  'freshersvoice',
  'fullstackjobs',
  'coding_jobs',
  'software_engineering_jobs',
  'web_development_jobs',
  'hire_developers',
  'techjobsalert',
  'react_india',
  'placement_drive',
  'remote_jobs_india',
  'freshersopenings',
  'jobsearchindia',
  'devjobsindia',
  'developers_india',
  'tech_jobs_hub'
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

// Cutoff: last 48 hours (from Oct 12 onwards)
const CUTOFF_TIMESTAMP = new Date('2026-10-12T00:00:00Z').getTime();

export async function harvestAllTelegram() {
  console.log(`\n================ HARVESTING ${tgChannels.length} TELEGRAM CHANNELS ================`);
  const allRawPosts = [];

  for (const ch of tgChannels) {
    try {
      const res = await fetchUrl(`https://t.me/s/${ch}`);
      if (res.status === 200 && res.html) {
        const posts = parseChannelPosts(ch, res.html);
        console.log(`Channel @${ch}: retrieved ${posts.length} posts.`);
        allRawPosts.push(...posts);

        // Fetch one previous page for deeper harvest
        const prevMatch = res.html.match(/href="\?before=(\d+)"/i);
        if (prevMatch) {
          await sleep(400);
          const prevRes = await fetchUrl(`https://t.me/s/${ch}?before=${prevMatch[1]}`);
          if (prevRes.status === 200 && prevRes.html) {
            const prevPosts = parseChannelPosts(ch, prevRes.html);
            allRawPosts.push(...prevPosts);
          }
        }
      } else {
        console.log(`Channel @${ch}: status ${res.status}`);
      }
    } catch (e) {
      console.log(`Channel @${ch} error:`, e.message);
    }
    await sleep(400);
  }

  // Deduplicate raw
  const seen = new Set();
  const dedupedRaw = [];
  for (const p of allRawPosts) {
    const key = p.postUrl || p.text.slice(0, 80);
    if (!seen.has(key)) {
      seen.add(key);
      dedupedRaw.push(p);
    }
  }

  // Filter for last 48 hours
  const recentPosts = dedupedRaw.filter(p => {
    if (!p.dateIso) return true;
    return new Date(p.dateIso).getTime() >= CUTOFF_TIMESTAMP;
  });

  console.log(`Total Telegram posts within 48h window: ${recentPosts.length}`);
  return recentPosts;
}
