const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const UniversalGuardInterceptor = require('./guards/universal_guard_interceptor.cjs');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const TODAY_DATE = process.argv[2] || '2026-10-26';
const ENGINE_ROOT = path.resolve(__dirname, '..');
const FILE3_PATH = path.join(ENGINE_ROOT, `total_todays_${TODAY_DATE}.json`);
const HIST_PATH = path.join(ENGINE_ROOT, 'total_historical_except_today.json');

async function runSlot3Harvest() {
  console.log('=================================================================');
  console.log(`🚀 [SLOT 3] STARTING LIVE MULTI-CHANNEL HARVEST (${TODAY_DATE})`);
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
    } catch (e) {
      console.warn('Warning loading historical set:', e.message);
    }
  }

  // 2. Load File 3 (Today's Total Pool)
  let todayPool = { date: TODAY_DATE, total: 0, jobs: [] };
  if (fs.existsSync(FILE3_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(FILE3_PATH, 'utf8'));
      if (Array.isArray(parsed)) {
        todayPool.jobs = parsed;
        todayPool.total = parsed.length;
      } else if (parsed && typeof parsed === 'object') {
        todayPool = {
          date: parsed.date || TODAY_DATE,
          total: (parsed.jobs && Array.isArray(parsed.jobs)) ? parsed.jobs.length : 0,
          jobs: Array.isArray(parsed.jobs) ? parsed.jobs : []
        };
      }
    } catch (e) {
      console.warn('Warning loading File 3:', e.message);
    }
  }
  const seenToday = new Set(todayPool.jobs.map(j => (j.url || j.recipient || '').trim().toLowerCase()));

  // Connect to Brave CDP
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();

  let tgNewLeads = 0;
  let naukriNewLeads = 0;
  let linkedinNewLeads = 0;
  let totalDuplicatesDropped = 0;

  // =================================================================
  // CHANNEL 1: TELEGRAM MULTI-CHANNEL SWEEP (21 CHANNELS)
  // =================================================================
  console.log('\n--- [CHANNEL 1] Scanning Telegram Channels ---');
  const tgPage = pages.find(p => p.url().includes('web.telegram.org'));
  if (!tgPage) {
    console.warn('⚠️ Telegram Web tab not found on port 9222. Skipping TG sweep.');
  } else {
    console.log('✅ Attached to open Telegram Web tab:', tgPage.url());
    const isLoggedOut = await tgPage.evaluate(() => !!document.querySelector('#auth-qr-form, .auth-form.qr'));
    if (isLoggedOut) {
      console.warn('⚠️ Telegram Web tab is currently awaiting QR code login. Skipping TG channel sweep.');
    } else {
      const registryPath = path.join(ENGINE_ROOT, 'telegram', 'tg_channels_registry.json');
      if (fs.existsSync(registryPath)) {
      const channels = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      console.log(`Scanning up to ${channels.length} channels from registry...`);

      // Sweep active tech channels from registry
      for (let i = 0; i < channels.length; i++) {
        const ch = channels[i];
        console.log(`[TG ${i + 1}/${channels.length}] Checking @${ch.username} (${ch.name})...`);

        try {
          const searchInput = await tgPage.$('#telegram-search-input');
          if (searchInput) {
            await tgPage.evaluate(() => {
              const el = document.getElementById('telegram-search-input');
              if (el) { el.focus(); el.click(); }
            });
            await sleep(300);
            await tgPage.keyboard.down('Control');
            await tgPage.keyboard.press('A');
            await tgPage.keyboard.up('Control');
            await tgPage.keyboard.press('Backspace');
            await sleep(200);

            await tgPage.keyboard.type(ch.username, { delay: 35 });
            await sleep(2000);

            const clicked = await tgPage.evaluate((uname, cname) => {
              const items = Array.from(document.querySelectorAll('.search-result, .ListItem, div[role="button"]'));
              const target = items.find(el => {
                const t = (el.innerText || '').toLowerCase();
                return t.includes(uname.toLowerCase()) || t.includes(cname.toLowerCase());
              });
              if (target) { target.click(); return true; }
              return false;
            }, ch.username, ch.name);

            if (!clicked) {
              console.log(`   ⚠️ Could not open @${ch.username}, moving to next.`);
              continue;
            }
          }

          await sleep(2000);

          // Scroll up deeper to load 3-day history (both unread and read messages)
          for (let s = 0; s < 8; s++) {
            await tgPage.evaluate(() => {
              const scrollable = document.querySelector('.messages-container, .bubbles-inner, .MessageList, .chat-list') || window;
              if (scrollable.scrollBy) scrollable.scrollBy(0, -1800);
            });
            await sleep(400);
          }

          // Extract messages
          const messages = await tgPage.evaluate(() => {
            const bubbles = Array.from(document.querySelectorAll('.message, .Message, .text-content, .message-content, div.text'));
            return bubbles.map(b => b.innerText?.trim()).filter(Boolean);
          });

          // Split digests into individual job blocks if multiple jobs exist in one post
          const subMessages = [];
          for (const msg of messages) {
            if (!msg || msg.length < 35) continue;
            // Check if multi-job digest (e.g. "1. ", "2. ", "3. ")
            if (/\n\s*(?:[0-9]{1,2}\.|[•\-\*])\s+[A-Za-z]/i.test(msg)) {
              const blocks = msg.split(/\n(?=\s*(?:[0-9]{1,2}\.|[•\-\*])\s+[A-Za-z])/);
              for (const b of blocks) {
                if (b.trim().length > 25) subMessages.push(b.trim());
              }
            } else {
              subMessages.push(msg);
            }
          }

          for (const msg of subMessages) {
            if (!msg || msg.length < 25) continue;

            const isStack = /react(?!\s*native)|frontend|front-end|mern|next\.?js|web developer|full stack|fullstack/i.test(msg);
            const isBanned = /react native|flutter|android|ios|devops|systems|embedded/i.test(msg);
            if (!isStack || isBanned) continue;

            const emailMatch = msg.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            const formMatch = msg.match(/https?:\/\/(?:forms\.gle|docs\.google\.com\/forms|careers\.[a-zA-Z0-9.-]+|job-boards\.[a-zA-Z0-9.-]+|jobs\.[a-zA-Z0-9.-]+)[^\s]+/i);
            const directUrlMatch = msg.match(/https?:\/\/[^\s]+/);

            const email = emailMatch ? emailMatch[0].toLowerCase() : null;
            const targetUrl = formMatch ? formMatch[0] : (directUrlMatch ? directUrlMatch[0] : null);
            const primaryTarget = email || targetUrl;

            if (!primaryTarget) continue;

            const normTarget = primaryTarget.trim().toLowerCase();
            if (historicalSet.has(normTarget) || seenToday.has(normTarget)) {
              totalDuplicatesDropped++;
              continue;
            }

            // Universal Eligibility (0-2 YOE)
            const eligibility = UniversalGuardInterceptor.assertJobEligibility(msg);
            if (!eligibility.pass) continue;

            let extractedCompany = 'Direct Telegram Lead';
            const compMatch = msg.match(/(?:company|organization|at|hiring at)\s*[:\-]?\s*([A-Za-z0-9\s&]{2,30})/i) ||
                              msg.match(/^[0-9•\-\*.\s]*([A-Za-z0-9\s&]{2,25})\s*[-–:]\s*(?:React|Frontend|MERN|Web|Full|Software|UI)/i);
            if (compMatch && compMatch[1]) {
              const cand = compMatch[1].trim();
              const lowerCand = cand.toLowerCase();
              if (!lowerCand.includes('hiring') && !lowerCand.includes('team') && !lowerCand.includes('dispatched') && !lowerCand.includes('application')) {
                extractedCompany = cand;
              }
            }

            const newJob = {
              id: `tg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              title: "Frontend / React Developer",
              company: extractedCompany,
              location: "India / Remote",
              url: targetUrl || "",
              recipient: email || "",
              application_type: email ? "Direct Recruiter Email" : "Direct Form",
              source: `Telegram (@${ch.username})`,
              date_posted: new Date().toISOString(),
              status: email ? "READY_FOR_DIRECT_EMAIL" : "DISCOVERED_PENDING_AUDIT",
              raw_text: msg.substring(0, 500)
            };

            todayPool.jobs.push(newJob);
            seenToday.add(normTarget);
            tgNewLeads++;
            console.log(`   ✨ [TG Qualified]: ${newJob.company} (${newJob.application_type}: ${primaryTarget})`);
          }
        } catch (err) {
          console.log(`   ⚠️ TG Channel error: ${err.message}`);
        }

        await sleep(1200);
      }
    }
    }
  }

  // =================================================================
  // CHANNEL 2: NAUKRI LIVE DROPS (0-2 YOE, <= 3 DAYS)
  // =================================================================
  console.log('\n--- [CHANNEL 2] Scanning Naukri Fresh Drops ---');
  let naukriPage = pages.find(p => p.url().includes('naukri.com'));
  let createdNaukriTab = false;
  if (!naukriPage) {
    naukriPage = await browser.newPage();
    createdNaukriTab = true;
  }

  try {
    const naukriQueries = [
      'https://www.naukri.com/react-developer-jobs?experience=0&experience=1&experience=2&jobAge=3',
      'https://www.naukri.com/frontend-developer-jobs?experience=0&experience=1&experience=2&jobAge=3'
    ];

    for (const nUrl of naukriQueries) {
      try {
        console.log('Navigating to Naukri query:', nUrl);
        await naukriPage.goto(nUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => {
          console.log(`   (Naukri navigation notice: ${e.message})`);
        });
        await sleep(3500);

        const jobCards = await naukriPage.evaluate(() => {
          const tuples = [];
          const articles = document.querySelectorAll('.srp-jobtuple-wrapper, article.jobTuple');
          articles.forEach(art => {
            const titleEl = art.querySelector('a.title');
            const compEl = art.querySelector('a.comp-name, .company-name');
            const expEl = art.querySelector('.exp-wrap, .experience');
            const locEl = art.querySelector('.loc-wrap, .location');
            const dateEl = art.querySelector('.job-post-day, .date');
            
            if (titleEl && compEl) {
              tuples.push({
                title: titleEl.innerText.trim(),
                url: titleEl.href.split('?')[0],
                company: compEl.innerText.trim(),
                experience: expEl ? expEl.innerText.trim() : '',
                location: locEl ? locEl.innerText.trim() : 'India',
                dateBadge: dateEl ? dateEl.innerText.trim() : ''
              });
            }
          });
          return tuples;
        });

        console.log(`Found ${jobCards.length} live job tuples on Naukri page.`);

        for (const card of jobCards) {
          if (!card.url) continue;
          const normUrl = card.url.trim().toLowerCase();

          if (historicalSet.has(normUrl) || seenToday.has(normUrl)) {
            totalDuplicatesDropped++;
            continue;
          }

          // Strict Stack Filter
          const titleLower = card.title.toLowerCase();
          const isBannedStack = /php|laravel|python|java developer|android|ios|flutter|react native|devops|marketing|rf sw|sales|hr |accountant|bpo/i.test(titleLower);
          if (isBannedStack) continue;

          const isFrontendStack = /react|frontend|front-end|next\.?js|ui developer|web developer|javascript|typescript|mern/i.test(titleLower);
          if (!isFrontendStack) continue;

          // Freshness: Must be <= 3 days
          const isFresh = /just now|today|1 day ago|2 days ago|3 days ago/i.test(card.dateBadge);
          if (!isFresh && card.dateBadge && !card.dateBadge.includes('day')) {
            continue;
          }

          // YOE ceiling: Candidate fits 0-2 YOE, and user explicitly instructed to keep broad ranges (0-3, 0-4, 1-4, 2-3, 2-4, 2-5)
          // Drop ONLY if strict minimum requirement is >= 3 years (e.g. 3-5, 3-6, 4-8, 3+, 4+)
          const expLower = card.experience.toLowerCase();
          if (/\b(?:[3-9]|1[0-9])\s*-\s*[0-9]+\s*(?:years?|yrs?)/i.test(expLower) || /\b(?:[3-9]|1[0-9])\s*\+\s*(?:years?|yrs?)/i.test(expLower)) {
            continue;
          }

          const newJob = {
            id: `naukri_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            title: card.title,
            company: card.company,
            location: card.location,
            url: card.url,
            recipient: "",
            application_type: "Naukri Direct / Portal",
            source: "Naukri (Past 3 Days)",
            experience: card.experience,
            date_posted: new Date().toISOString(),
            date_badge: card.dateBadge,
            status: "DISCOVERED_PENDING_AUDIT"
          };

          todayPool.jobs.push(newJob);
          seenToday.add(normUrl);
          naukriNewLeads++;
          console.log(`   ✨ [Naukri Qualified]: ${card.company} - ${card.title} (${card.experience})`);
        }
      } catch (qErr) {
        console.warn('⚠️ Error processing Naukri query:', qErr.message);
      }
    }
  } catch (err) {
    console.warn('⚠️ Naukri harvest error:', err.message);
  } finally {
    if (createdNaukriTab && naukriPage) {
      await naukriPage.close();
    }
  }

  // =================================================================
  // CHANNEL 3: LINKEDIN LIVE RECRUITER POSTS (PAST 24H / 3 DAYS)
  // =================================================================
  console.log('\n--- [CHANNEL 3] Scanning LinkedIn Recruiter Posts ---');
  let liPage = pages.find(p => p.url().includes('linkedin.com'));
  let createdLiTab = false;
  if (!liPage) {
    liPage = await browser.newPage();
    createdLiTab = true;
  }

  try {
    const liQueries = [
      'https://www.linkedin.com/search/results/content/?keywords=%22Frontend%20Developer%22%20hiring&origin=GLOBAL_SEARCH_HEADER&sortBy=%22date_posted%22',
      'https://www.linkedin.com/search/results/content/?keywords=%22React%20Developer%22%20hiring&origin=GLOBAL_SEARCH_HEADER&sortBy=%22date_posted%22'
    ];

    for (const liSearchUrl of liQueries) {
      try {
        console.log('Navigating to LinkedIn search:', liSearchUrl);
        await liPage.goto(liSearchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => {
          console.log(`   (LinkedIn navigation notice: ${e.message})`);
        });
        await sleep(3500);

        // Natural human scroll
        for (let i = 0; i < 4; i++) {
          await liPage.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
          await sleep(1500);
        }

        const posts = await liPage.evaluate(() => {
          const results = [];
          let containers = Array.from(document.querySelectorAll('.feed-shared-update-v2, div[data-chameleon-result-urn], .search-results-container li, div.update-components-text'));
          if (containers.length === 0) {
            containers = Array.from(document.querySelectorAll('main div')).filter(d => (d.innerText || '').includes('Feed post') && (d.innerText || '').length > 100);
          }
          const seenTexts = new Set();
          containers.forEach(c => {
            const text = (c.innerText || '').trim();
            if (text.length > 50 && !seenTexts.has(text.substring(0, 80))) {
              seenTexts.add(text.substring(0, 80));
              const linkEl = c.querySelector('a[href*="/feed/update/"], a[href*="/posts/"], a[href*="/in/"]');
              results.push({
                text,
                postUrl: linkEl ? linkEl.href : ''
              });
            }
          });
          return results;
        });

        console.log(`Extracted ${posts.length} post containers from LinkedIn feed.`);

        for (const p of posts) {
          if (!p.text || p.text.length < 50) continue;
          const text = p.text;

          const isStack = /react(?!\s*native)|frontend|front-end|mern|next\.?js/i.test(text);
          if (!isStack) continue;

          const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          const urlMatch = text.match(/https?:\/\/[^\s]+/);

          const target = (emailMatch ? emailMatch[0] : (urlMatch ? urlMatch[0] : p.postUrl)).toLowerCase();
          if (!target) continue;

          if (historicalSet.has(target) || seenToday.has(target)) {
            totalDuplicatesDropped++;
            continue;
          }

          // Check 0-2 YOE
          const eligibility = UniversalGuardInterceptor.assertJobEligibility(text);
          if (!eligibility.pass) continue;

          const newJob = {
            id: `li_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            title: "Frontend / React Engineer",
            company: "LinkedIn Recruiter Post",
            location: "India / Remote",
            url: urlMatch ? urlMatch[0] : (p.postUrl || ""),
            recipient: emailMatch ? emailMatch[0] : "",
            application_type: emailMatch ? "Direct Recruiter Email" : "Direct Form",
            source: "LinkedIn Live Posts",
            date_posted: new Date().toISOString(),
            status: emailMatch ? "READY_FOR_DIRECT_EMAIL" : "DISCOVERED_PENDING_AUDIT",
            raw_text: text.substring(0, 400)
          };

          todayPool.jobs.push(newJob);
          seenToday.add(target);
          linkedinNewLeads++;
          console.log(`   ✨ [LinkedIn Qualified]: ${newJob.application_type} (${target})`);
        }
      } catch (liErr) {
        console.warn('⚠️ LinkedIn query error:', liErr.message);
      }
    }
  } catch (err) {
    console.warn('⚠️ LinkedIn harvest error:', err.message);
  } finally {
    if (createdLiTab && liPage) {
      await liPage.close();
    }
  }

  // Update File 3
  todayPool.total = todayPool.jobs.length;
  todayPool.updated_at = new Date().toISOString();
  fs.writeFileSync(FILE3_PATH, JSON.stringify(todayPool, null, 2), 'utf8');

  // Summary object for Slot 3
  const summary = {
    date: TODAY_DATE,
    slot: 3,
    channels: {
      telegram: tgNewLeads,
      naukri: naukriNewLeads,
      linkedin: linkedinNewLeads
    },
    totalNewHarvested: tgNewLeads + naukriNewLeads + linkedinNewLeads,
    totalDuplicatesDropped,
    file3Total: todayPool.total,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(path.join(ENGINE_ROOT, 'slot3_harvest_summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n=================================================================');
  console.log(`📊 [SLOT 3 COMPLETE HARVEST SUMMARY]`);
  console.log(`- Telegram Leads:        ${tgNewLeads}`);
  console.log(`- Naukri Fresh Drops:     ${naukriNewLeads}`);
  console.log(`- LinkedIn Posts Leads:   ${linkedinNewLeads}`);
  console.log(`- Total New Discovered:   ${summary.totalNewHarvested}`);
  console.log(`- Duplicates Dropped:     ${totalDuplicatesDropped}`);
  console.log(`- Total Staged in File 3: ${todayPool.total}`);
  console.log('=================================================================');

  await browser.disconnect();
}

runSlot3Harvest().catch(err => {
  console.error('Fatal Slot 3 Harvest Error:', err);
  process.exit(1);
});
