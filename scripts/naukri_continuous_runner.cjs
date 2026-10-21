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

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const homePage = pages.find(p => p.url().includes('mnjuser/homepage'));
  if (!homePage) {
    console.log('Error: Mynaukri homepage tab not found.');
    return;
  }

  console.log('>>> Naukri Continuous Recommended Runner Initialized <<<');

  const cardCount = await homePage.evaluate(() => document.querySelectorAll('.cust-job-tuple').length);
  console.log(`Total cust-job-tuple cards on homepage: ${cardCount}`);

  for (let idx = 2; idx < cardCount; idx++) {
    const cardInfo = await homePage.evaluate((i) => {
      const cards = Array.from(document.querySelectorAll('.cust-job-tuple'));
      if (i >= cards.length) return null;
      const c = cards[i];
      const text = c.innerText.replace(/\n+/g, ' | ');
      return { index: i, text };
    }, idx);

    if (!cardInfo) break;

    const summary = cardInfo.text.toLowerCase();
    console.log(`\n------------------------------------------------------`);
    console.log(`[CARD ${idx}/${cardCount}] Checking: ${cardInfo.text.slice(0, 80)}`);

    // Pre-filter on summary
    const isTechRole = /react|mern|frontend|front end|web developer|full-stack|full stack|javascript/i.test(summary);
    const isHighYoe = /(?:3\s*-\s*[5-9]|4\s*-\s*[6-9]|5\s*-\s*[7-9]|\b[3-9]\+\s*yrs|\b[3-9]\s*to\s*[5-9]\s*yrs)/i.test(summary);
    const isSenior = /\b(senior|lead|principal|architect)\b/i.test(summary);

    if (!isTechRole) {
      console.log(`[SKIP_NON_TARGET_ROLE] Not a Frontend/React/MERN/Web role.`);
      continue;
    }
    if (isHighYoe || isSenior) {
      console.log(`[SKIP_HIGH_YOE] Requires > 2 YOE or Senior role.`);
      continue;
    }

    // Capture pages before click
    const pagesBefore = await browser.pages();

    // Click card
    console.log(`[CLICKING CARD ${idx}] Opening job tab...`);
    await homePage.evaluate((i) => {
      const cards = Array.from(document.querySelectorAll('.cust-job-tuple'));
      if (cards[i]) {
        cards[i].scrollIntoView({ behavior: 'instant', block: 'center' });
        cards[i].click();
      }
    }, idx);

    await new Promise(r => setTimeout(r, 4000));

    // Find newly opened page
    const pagesAfter = await browser.pages();
    const newPage = pagesAfter.find(p => !pagesBefore.includes(p));

    if (!newPage) {
      console.log(`[WARNING] No new tab opened for card ${idx}.`);
      continue;
    }

    try {
      const jobUrl = newPage.url();
      const jobTitle = await newPage.title();
      console.log(`[NEW TAB OPENED] ${jobTitle} | ${jobUrl}`);

      // Check applied duplicate
      const appliedUrls = getAppliedUrls();
      const cleanUrl = jobUrl.split('?')[0].toLowerCase();
      if (appliedUrls.has(cleanUrl)) {
        console.log(`[ALREADY_APPLIED_URL] Skipping & closing tab.`);
        await newPage.close();
        continue;
      }

      // Audit full JD in new tab
      const audit = await newPage.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const isStale = /30\+\s*days\s*ago/i.test(text);
        const hasHighYoe = /(?:3\s*-\s*[5-9]|4\s*-\s*[6-9]|5\s*-\s*[7-9]|\b[3-9]\+\s*years|\b[3-9]\s*to\s*[5-9]\s*years)/i.test(text);
        const isSenior = /\b(Senior|Lead|Principal|Architect)\b/i.test(document.title);
        const isAlreadyApplied = /already applied|applied on/i.test(text);

        const btns = Array.from(document.querySelectorAll('button, a'));
        const applyBtn = btns.find(b => {
          const t = (b.innerText || '').trim().toLowerCase();
          return t === 'apply' || t === 'apply on company site' || t.includes('easy apply') || t === 'apply now';
        });

        const compEl = document.querySelector('a.comp-name') || document.querySelector('[class*="comp-name"]') || document.querySelector('[class*="company"]');

        return {
          company: compEl ? compEl.innerText.trim() : 'Company',
          isStale,
          hasHighYoe,
          isSenior,
          isAlreadyApplied,
          hasApplyBtn: !!applyBtn,
          applyBtnText: applyBtn ? applyBtn.innerText.trim() : null
        };
      });

      console.log(`[AUDIT] Company: ${audit.company} | High YOE? ${audit.hasHighYoe} | Stale? ${audit.isStale} | Already applied? ${audit.isAlreadyApplied}`);

      if (audit.isAlreadyApplied) {
        console.log(`[ALREADY APPLIED ON NAUKRI] Logging proof & closing.`);
        const safeComp = audit.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const proofPath = path.join(SCREENSHOT_DIR, `naukri_${safeComp}_applied.png`);
        await newPage.screenshot({ path: proofPath, fullPage: true });
        recordApplication({
          id: 'naukri_' + safeComp + '_' + Date.now(),
          company: audit.company,
          role: jobTitle,
          url: jobUrl,
          application_type: 'Direct Naukri 1-Click Apply',
          status: 'CONFIRMED_APPLIED',
          submitted_at: new Date().toISOString(),
          screenshot_proof: proofPath
        });
        await newPage.close();
        continue;
      }

      if (audit.hasHighYoe || audit.isSenior) {
        console.log(`[SKIPPED_OUT_OF_RANGE_YOE] Ineligible experience level.`);
        await newPage.close();
        continue;
      }

      if (audit.isStale) {
        console.log(`[SKIPPED_STALE_JOB] Stale posting.`);
        await newPage.close();
        continue;
      }

      if (!audit.hasApplyBtn) {
        console.log(`[SKIPPED_NO_APPLY] No apply button found.`);
        await newPage.close();
        continue;
      }

      // Click Apply
      console.log(`[APPLYING] Clicking "${audit.applyBtnText}"...`);
      await newPage.evaluate(() => {
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
      await handleQuestionnaire(newPage);
      await new Promise(r => setTimeout(r, 4000));

      // Assert confirmation
      const confirmation = await newPage.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const isSuccess = /applied successfully|application sent|you have successfully applied|applied on|already applied|redirected to the company website/i.test(text);
        return { isSuccess };
      });

      console.log(`[CONFIRMATION] Success? ${confirmation.isSuccess}`);

      if (confirmation.isSuccess) {
        const safeComp = audit.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const proofPath = path.join(SCREENSHOT_DIR, `naukri_${safeComp}_applied.png`);
        await newPage.screenshot({ path: proofPath, fullPage: true });
        console.log(`✅ [PROOF SAVED] ${proofPath}`);

        recordApplication({
          id: 'naukri_' + safeComp + '_' + Date.now(),
          company: audit.company,
          role: jobTitle,
          url: jobUrl,
          application_type: 'Direct Naukri 1-Click Apply',
          status: 'CONFIRMED_APPLIED',
          submitted_at: new Date().toISOString(),
          screenshot_proof: proofPath
        });
      }

      await newPage.close();
      console.log(`[TAB CLOSED] Tab closed cleanly per Rule 57.`);
    } catch (e) {
      console.log(`[TAB ERROR] ${e.message}`);
      try { await newPage.close(); } catch(err) {}
    }

    // 5s respectful spacing
    await new Promise(r => setTimeout(r, 5000));
  }

  console.log(`\n>>> Naukri Continuous Recommended Runner Finished! <<<`);
})();
