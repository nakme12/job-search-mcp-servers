/**
 * SLOT 3 DEDICATED LIVE FEEDS HARVESTER (TELEGRAM + LINKEDIN)
 * Runs strictly during Slot 3 (12:00 PM - 12:20 PM)
 * 
 * 1. Sweeps 21 active Telegram developer/recruiter channels for past 3 days posts.
 * 2. Extracts direct emails (@company.com) and application links.
 * 3. Ingests raw leads directly into total_todays_<DATE>_shift1.json with deduplication.
 */

import fs from 'fs';
import path from 'path';
import { harvestAllTelegram } from './harvest_all_tg.mjs';
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

async function runSlot3Harvest() {
  console.log(`=======================================================`);
  console.log(`🚀 RUNNING SLOT 3: PARALLEL LIVE FEEDS (TELEGRAM + DIRECT POSTS)`);
  console.log(`=======================================================`);

  const tgPosts = await harvestAllTelegram();
  console.log(`Retrieved ${tgPosts.length} fresh Telegram posts.`);

  let addedCount = 0;
  let skippedDup = 0;

  for (const post of tgPosts) {
    const text = post.text || '';
    
    // Check for Frontend / React stack
    if (!/\b(react|frontend|front-end|next\.?js|web developer|ui developer|mern)\b/i.test(text)) {
      continue;
    }
    // Drop senior/lead
    if (/\b(senior|sr\.?|lead|principal|architect|manager|head)\b/i.test(text)) {
      continue;
    }

    // Extract emails and links
    const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const urlMatches = text.match(/https?:\/\/[^\s<"']+/g) || [];

    const validEmail = emailMatches.find(e => !e.includes('gmail') && !e.includes('yahoo') && !e.includes('telegram'));
    const targetUrl = urlMatches.find(u => !u.includes('t.me') && !u.includes('telegram'));

    const identifier = targetUrl || validEmail || post.postUrl;
    if (!identifier) continue;

    const normId = normalizeTargetId(identifier);
    if (seenInShift.has(normId)) continue;
    seenInShift.add(normId);

    if (isDuplicateHistorical(normId)) {
      skippedDup++;
      continue;
    }

    const firstLine = text.split('\n')[0].slice(0, 100);
    const companyMatch = text.match(/(?:at|company|hiring for)[:\s]+([A-Za-z0-9\s]+)/i);
    const companyName = companyMatch ? companyMatch[1].trim() : (post.channel ? `@${post.channel}` : "Tech Startup");

    const entry = {
      id: totalShift1.jobs.length + 1,
      company: companyName,
      role: firstLine,
      location: "India / Remote",
      url: targetUrl || post.postUrl,
      recipient: validEmail || null,
      source: `Telegram (@${post.channel || 'feed'})`,
      date_posted: post.dateIso || new Date().toISOString(),
      status: "DISCOVERED_PENDING_AUDIT",
      discovered_at: new Date().toISOString()
    };

    totalShift1.jobs.push(entry);
    addedCount++;
    console.log(`[SLOT 3 TG] + [${companyName}] ${firstLine} -> ${identifier}`);
  }

  totalShift1.total = totalShift1.jobs.length;
  fs.writeFileSync(shift1TotalFile, JSON.stringify(totalShift1, null, 2), 'utf8');
  fs.writeFileSync(paths.todayTotal, JSON.stringify(totalShift1, null, 2), 'utf8');

  console.log(`\n=======================================================`);
  console.log(`🎯 SLOT 3 LIVE FEEDS COMPLETE`);
  console.log(`- Fresh Leads Added from Telegram: ${addedCount}`);
  console.log(`- Skipped Historical Duplicates: ${skippedDup}`);
  console.log(`- Total Shift 1 Raw Pool Now: ${totalShift1.total}`);
  console.log(`=======================================================`);
}

runSlot3Harvest().catch(console.error);
