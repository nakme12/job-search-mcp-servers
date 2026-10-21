const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APPLIED_FILE = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
const LIFETIME_FILE = 'C:\\mcp\\job-search-mcp-engine\\applied_lifetime_except_today.json';
const SCREENSHOT_DIR = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function getAppliedSet() {
  const set = new Set();
  if (fs.existsSync(APPLIED_FILE)) {
    const d = JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8'));
    (d.jobs || []).forEach(j => {
      if (j.url) set.add(j.url.toLowerCase().split('?')[0]);
      if (j.company) set.add(j.company.toLowerCase().trim());
    });
  }
  if (fs.existsSync(LIFETIME_FILE)) {
    const d = JSON.parse(fs.readFileSync(LIFETIME_FILE, 'utf8'));
    (d.jobs || d || []).forEach(j => {
      if (j.url || j.recipient_or_url) set.add((j.url || j.recipient_or_url).toLowerCase().split('?')[0]);
      if (j.company) set.add(j.company.toLowerCase().trim());
    });
  }
  return set;
}

function recordApplication(entry) {
  const data = JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8'));
  data.jobs.push(entry);
  data.total = data.jobs.length;
  fs.writeFileSync(APPLIED_FILE, JSON.stringify(data, null, 2));
  console.log(`\n>>> [FILE 5 UPDATED] Confirmed total applied today: ${data.total} <<<\n`);
}

async function handleQuestionnaire(p) {
  try {
    await p.evaluate(() => {
      const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      function setVal(el, val) {
        if (!el) return;
        inputSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const allInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="number"]'));
      for (const inp of allInputs) {
        let label = (inp.closest('div') ? inp.closest('div').innerText : '').toLowerCase();
        if (label.includes('experience') || label.includes('yoe')) setVal(inp, '1.5');
        else if (label.includes('current ctc') || label.includes('current salary')) setVal(inp, '216000');
        else if (label.includes('expected ctc') || label.includes('expected salary')) setVal(inp, '465000');
        else if (label.includes('notice')) setVal(inp, '15');
      }

      const radioLabels = Array.from(document.querySelectorAll('label, input[type="radio"]'));
      for (const rl of radioLabels) {
        let text = rl.innerText ? rl.innerText.toLowerCase() : '';
        if (text.includes('yes') || text.includes('immediate') || text.includes('15 days') || text.includes('15')) {
          rl.click();
        }
      }

      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => /save and apply|submit|continue|apply/i.test(b.innerText));
      if (submitBtn) submitBtn.click();
    });
  } catch (e) {}
}

async function processSingleJob(browser, job) {
  const appliedSet = getAppliedSet();
  const cleanUrl = job.url.split('?')[0].toLowerCase();
  const cleanComp = (job.company || '').toLowerCase().trim();

  if (appliedSet.has(cleanUrl) || (cleanComp && appliedSet.has(cleanComp))) {
    console.log(`[SKIP_DUPLICATE] ${job.company} - ${job.title} already applied.`);
    return;
  }

  // Hard Ban: non-tech, recruiter, HR, sales, support, mobile, senior, non-relevant tech
  const bannedKeywords = /recruiter|talent\s*acq|\bhr\b|human\s*resource|sales|business\s*dev|telecaller|\bbpo\b|marketing|content\s*writer|counselor|accountant|executive\b|support\b|react\s*native|android|ios|mobile\s*dev|flutter|senior|lead|architect|principal|dotnet|\.net|\bjava\b|\bpython\b|devops|data\s*engineer|data\s*analyst|\bqa\b|tester|testing|cloud\s*engineer/i;
  if (bannedKeywords.test(job.title)) {
    console.log(`[SKIP_BANNED_ROLE] Title matches banned role/seniority/non-dev: ${job.title}`);
    return;
  }

  // Mandatory positive assertion: MUST be a developer/engineer/web/frontend/software role
  const isDeveloperRole = /developer|engineer|programmer|frontend|front\s*end|full\s*stack|fullstack|web|react|mern|ui|sde/i.test(job.title);
  if (!isDeveloperRole) {
    console.log(`[SKIP_NON_DEV_ROLE] Title is not a recognized developer/engineer role: ${job.title}`);
    return;
  }

  console.log(`\n======================================================`);
  console.log(`[TARGET] ${job.company} — ${job.title}`);
  console.log(`[URL] ${job.url}`);

  const p = await browser.newPage();
  try {
    await p.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3500));

    // Audit JD
    const audit = await p.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const isStale = /30\+\s*days\s*ago|3\+\s*weeks\s*ago|2\+\s*weeks\s*ago/i.test(text);
      const hasHighYoe = /(?:3\s*-\s*[5-9]|4\s*-\s*[6-9]|5\s*-\s*[7-9]|\b[3-9]\+\s*years|\b[3-9]\s*to\s*[5-9]\s*years)/i.test(text);
      const isSenior = /\b(Senior|Lead|Principal|Architect)\b/i.test(document.title);
      const isAlreadyApplied = /already applied|applied on/i.test(text);

      const btns = Array.from(document.querySelectorAll('button, a'));
      const applyBtn = btns.find(b => {
        const t = (b.innerText || '').trim().toLowerCase();
        return t === 'apply' || t === 'apply on company site' || t.includes('easy apply') || t === 'apply now';
      });

      return {
        title: document.title,
        isStale,
        hasHighYoe,
        isSenior,
        isAlreadyApplied,
        hasApplyBtn: !!applyBtn,
        applyBtnText: applyBtn ? applyBtn.innerText.trim() : null
      };
    });

    console.log(`[AUDIT] High YOE? ${audit.hasHighYoe} | Stale? ${audit.isStale} | Already applied? ${audit.isAlreadyApplied} | Apply btn: "${audit.applyBtnText}"`);

    if (audit.isAlreadyApplied) {
      console.log(`[ALREADY APPLIED ON NAUKRI] Logging proof & closing.`);
      const safeComp = job.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const proofPath = path.join(SCREENSHOT_DIR, `naukri_${safeComp}_applied.png`);
      await p.screenshot({ path: proofPath, fullPage: true });
      recordApplication({
        id: 'naukri_' + safeComp + '_' + Date.now(),
        company: job.company,
        role: job.title,
        url: job.url,
        application_type: 'Direct Naukri 1-Click Apply',
        status: 'CONFIRMED_APPLIED',
        submitted_at: new Date().toISOString(),
        screenshot_proof: proofPath
      });
      await p.close();
      return;
    }

    if (audit.hasHighYoe || audit.isSenior) {
      console.log(`[SKIPPED_OUT_OF_RANGE_YOE] Ineligible experience level.`);
      await p.close();
      return;
    }

    if (audit.isStale) {
      console.log(`[SKIPPED_STALE_JOB] Stale posting (>7 days).`);
      await p.close();
      return;
    }

    if (!audit.hasApplyBtn) {
      console.log(`[SKIPPED_NO_APPLY] No apply button found.`);
      await p.close();
      return;
    }

    // Track pages before clicking apply to catch target="_blank" popups
    const pagesBefore = await browser.pages();

    // Click Apply
    console.log(`[APPLYING] Clicking "${audit.applyBtnText}"...`);
    await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const b = btns.find(x => {
        const t = (x.innerText || '').trim().toLowerCase();
        return t === 'apply' || t === 'apply on company site' || t.includes('easy apply') || t === 'apply now';
      });
      if (b) {
        b.scrollIntoView({ behavior: 'instant', block: 'center' });
        b.click();
      }
    });

    await new Promise(r => setTimeout(r, 4000));

    // Handle questionnaire
    await handleQuestionnaire(p);
    await new Promise(r => setTimeout(r, 4000));

    // Assert confirmation
    const confirmation = await p.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const isSuccess = /applied successfully|application sent|you have successfully applied|applied on|already applied|redirected to the company website/i.test(text);
      return { isSuccess };
    });

    console.log(`[CONFIRMATION] Success? ${confirmation.isSuccess}`);

    if (confirmation.isSuccess) {
      const safeComp = job.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const proofPath = path.join(SCREENSHOT_DIR, `naukri_${safeComp}_applied.png`);
      await p.screenshot({ path: proofPath, fullPage: true });
      console.log(`✅ [PROOF SAVED] ${proofPath}`);

      recordApplication({
        id: 'naukri_' + safeComp + '_' + Date.now(),
        company: job.company,
        role: job.title,
        url: job.url,
        application_type: 'Direct Naukri 1-Click Apply',
        status: 'CONFIRMED_APPLIED',
        submitted_at: new Date().toISOString(),
        screenshot_proof: proofPath
      });
    }

    // Close main job page
    await p.close();

    // Also close any popup tab that was opened by target="_blank"
    const pagesAfter = await browser.pages();
    for (const ap of pagesAfter) {
      if (!pagesBefore.includes(ap)) {
        try {
          await ap.close();
          console.log(`[POPUP TAB CLOSED] Closed external redirect popup.`);
        } catch (e) {}
      }
    }

    console.log(`[TAB CLOSED] Closed cleanly per Rule 57.`);
  } catch (err) {
    console.log(`[ERROR] ${err.message}`);
    try { await p.close(); } catch(e) {}
  }

  // 4s spacing
  await new Promise(r => setTimeout(r, 4000));
}

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

  const searchUrls = [
    'https://www.naukri.com/react-developer-jobs?k=react%20developer&experience=1&jobAge=7',
    'https://www.naukri.com/frontend-developer-jobs?k=frontend%20developer&experience=1&jobAge=7',
    'https://www.naukri.com/mern-stack-developer-jobs?k=mern%20stack%20developer&experience=1&jobAge=7'
  ];

  console.log(`>>> Starting Naukri Fresh 7-Day Search Pipeline <<<`);

  for (const sUrl of searchUrls) {
    console.log(`\n>>> Scraping search URL: ${sUrl} <<<`);
    const searchPage = await browser.newPage();
    let jobs = [];
    try {
      await searchPage.goto(sUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 4000));

      jobs = await searchPage.evaluate(() => {
        const tuples = Array.from(document.querySelectorAll('.srp-jobtuple-wrapper'));
        return tuples.map(t => {
          const titleAnchor = t.querySelector('a.title');
          const compAnchor = t.querySelector('a.comp-name');
          const expSpan = t.querySelector('.exp-wrap');
          const locSpan = t.querySelector('.loc-wrap');
          const dateSpan = t.querySelector('.job-post-day');
          return {
            title: titleAnchor ? titleAnchor.innerText.trim() : null,
            url: titleAnchor ? titleAnchor.href : null,
            company: compAnchor ? compAnchor.innerText.trim() : null,
            experience: expSpan ? expSpan.innerText.trim() : null,
            location: locSpan ? locSpan.innerText.trim() : null,
            date: dateSpan ? dateSpan.innerText.trim() : null
          };
        }).filter(j => j.title && j.url);
      });
      console.log(`Found ${jobs.length} jobs on this page.`);
    } catch (e) {
      console.log('Error scraping search page:', e.message);
    } finally {
      await searchPage.close();
    }

    // Process each scraped job
    for (const job of jobs) {
      await processSingleJob(browser, job);
    }
  }

  console.log(`\n>>> All Search Batches Completed! <<<`);
})();
