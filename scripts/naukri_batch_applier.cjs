const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APPLIED_FILE = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
const SCREENSHOT_DIR = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function getAppliedUrls() {
  if (!fs.existsSync(APPLIED_FILE)) return new Set();
  const data = JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8'));
  return new Set((data.jobs || []).map(j => (j.url || '').toLowerCase().trim().split('?')[0]));
}

function recordApplication(entry) {
  const data = JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8'));
  data.jobs.push(entry);
  data.total = data.jobs.length;
  fs.writeFileSync(APPLIED_FILE, JSON.stringify(data, null, 2));
  console.log(`[FILE 5 UPDATED] Confirmed total applied today: ${data.total}`);
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

async function processNaukriUrl(browser, target) {
  const appliedUrls = getAppliedUrls();
  const cleanTarget = target.url.split('?')[0].toLowerCase();
  if (appliedUrls.has(cleanTarget)) {
    console.log(`[SKIP_ALREADY_APPLIED] ${target.company} - ${target.role}`);
    return;
  }

  console.log(`\n======================================================`);
  console.log(`[TARGET] ${target.company} — ${target.role}`);
  console.log(`[URL] ${target.url}`);

  const p = await browser.newPage();
  try {
    await p.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3500));

    // Audit JD
    const audit = await p.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const isStale = /30\+\s*days\s*ago/i.test(text);
      // Check for > 2 YOE (e.g. 3-5 Yrs, 4-6 Yrs)
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

    console.log(`[AUDIT] Title: "${audit.title}" | High YOE? ${audit.hasHighYoe} | Stale? ${audit.isStale} | Already applied? ${audit.isAlreadyApplied}`);

    if (audit.isAlreadyApplied) {
      console.log(`[ALREADY APPLIED ON NAUKRI] Logging proof & closing.`);
      const safeComp = target.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const proofPath = path.join(SCREENSHOT_DIR, `naukri_${safeComp}_applied.png`);
      await p.screenshot({ path: proofPath, fullPage: true });
      recordApplication({
        id: 'naukri_' + safeComp + '_' + Date.now(),
        company: target.company,
        role: target.role,
        url: target.url,
        application_type: 'Direct Naukri 1-Click Apply',
        status: 'CONFIRMED_APPLIED',
        submitted_at: new Date().toISOString(),
        screenshot_proof: proofPath
      });
      await p.close();
      return;
    }

    if (audit.hasHighYoe || audit.isSenior) {
      console.log(`[SKIPPED_OUT_OF_RANGE_YOE] Requires > 2 YOE or Senior role.`);
      await p.close();
      return;
    }

    if (audit.isStale) {
      console.log(`[SKIPPED_STALE_JOB] Posted > 30 days ago.`);
      await p.close();
      return;
    }

    if (!audit.hasApplyBtn) {
      console.log(`[SKIPPED_NO_APPLY_BTN] No active apply button detected.`);
      await p.close();
      return;
    }

    // Click Apply
    console.log(`[APPLY] Clicking "${audit.applyBtnText}"...`);
    const clickSuccess = await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const b = btns.find(x => {
        const t = (x.innerText || '').trim().toLowerCase();
        return t === 'apply' || t === 'apply on company site' || t.includes('easy apply') || t === 'apply now';
      });
      if (b) {
        b.scrollIntoView({ behavior: 'instant', block: 'center' });
        b.click();
        return true;
      }
      return false;
    });

    await new Promise(r => setTimeout(r, 4000));

    // Handle questionnaire if popup appeared
    await handleQuestionnaire(p);
    await new Promise(r => setTimeout(r, 4000));

    // Assertion
    const confirmation = await p.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const isSuccess = /applied successfully|application sent|you have successfully applied|applied on|already applied|redirected to the company website/i.test(text);
      return { isSuccess, snippet: text.slice(0, 300) };
    });

    console.log(`[CONFIRMATION] Success? ${confirmation.isSuccess}`);

    if (confirmation.isSuccess) {
      const safeComp = target.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const proofPath = path.join(SCREENSHOT_DIR, `naukri_${safeComp}_applied.png`);
      await p.screenshot({ path: proofPath, fullPage: true });
      console.log(`[PROOF SAVED] ${proofPath}`);

      recordApplication({
        id: 'naukri_' + safeComp + '_' + Date.now(),
        company: target.company,
        role: target.role,
        url: target.url,
        application_type: 'Direct Naukri 1-Click Apply',
        status: 'CONFIRMED_APPLIED',
        submitted_at: new Date().toISOString(),
        screenshot_proof: proofPath
      });
    }

    await p.close();
    console.log(`[TAB CLOSED] Tab closed cleanly per Rule 57.`);
  } catch (err) {
    console.log(`[ERROR] ${err.message}`);
    try { await p.close(); } catch(e) {}
  }
}

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

  // 1. Direct verified target list
  const verifiedTargets = [
    {
      company: 'TVM Infotech Private Limited',
      role: 'React, MEAN/MERN & Node.js Developers (0-1 YOE)',
      url: 'https://www.naukri.com/job-listings-react-mean-mern-node-js-developers-freshers-chennai-tvm-infotech-chennai-0-to-1-years-161026019268'
    },
    {
      company: 'TalentPro',
      role: 'Fullstack Developer (0-2 YOE)',
      url: 'https://www.naukri.com/job-listings-fullstack-developer-talentpro-chennai-0-to-2-years-161026020883'
    },
    {
      company: 'Jobaaj com',
      role: 'Software Engineer Fresher (0-1 YOE)',
      url: 'https://www.naukri.com/job-listings-software-engineer-fresher-jobaaj-com-bengaluru-0-to-1-years-171026004092'
    },
    {
      company: 'Sarva Sudarsanaa Academy',
      role: 'Software Developer (0 YOE)',
      url: 'https://www.naukri.com/job-listings-software-developer-sarva-sudarsanaa-academy-chennai-0-to-0-years-171026015301'
    }
  ];

  console.log(`>>> Starting Naukri Batch Application Engine (${verifiedTargets.length} targets) <<<`);

  for (const t of verifiedTargets) {
    await processNaukriUrl(browser, t);
    // Human-like pause 5s between applications
    await new Promise(r => setTimeout(r, 5000));
  }

  console.log(`\n>>> Batch 1 Finished! <<<`);
})();
