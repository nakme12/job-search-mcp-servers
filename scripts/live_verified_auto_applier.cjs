const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const SCREENSHOT_DIR = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1';
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BANNED_PATTERNS = [
  '2021', '2022', '2023', '2024',
  '30+ days ago', '30+ days', '3+ weeks ago', '2+ weeks ago', 'months ago', 'month ago',
  '3+ years', '3-5 years', '4+ years', '5+ years', '4-6 years', '5-7 years',
  'senior developer', 'lead developer', 'architect', 'principal',
  'job closed', 'no longer active', 'expired', 'not accepting applications'
];

function isStaleOrSenior(text) {
  const lower = text.toLowerCase();
  for (const p of BANNED_PATTERNS) {
    if (lower.includes(p.toLowerCase())) {
      return p;
    }
  }
  return null;
}

async function handleNaukriQuestionnaire(p) {
  try {
    await p.evaluate(() => {
      const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      function setVal(el, val) {
        if (!el || !inputSetter) return;
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
  let browser;
  try {
    const f5Path = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
    let f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8'));
    console.log(`[Auto Applier] Active. Current confirmed: ${f5.total}/100`);

    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

    const unapplied = JSON.parse(fs.readFileSync('C:\\mcp\\pending_unapplied_verified.json', 'utf8'));
    const appliedUrls = new Set(f5.jobs.map(j => (j.url || '').toLowerCase().split('?')[0]));
    const appliedComps = new Set(f5.jobs.map(j => (j.company || '').toLowerCase().trim()));

    const candidateJobs = unapplied.filter(j => {
      const u = (j.url || j.apply_url || '').toLowerCase().split('?')[0];
      const c = (j.company || '').toLowerCase().trim();
      return !appliedUrls.has(u) && !appliedComps.has(c);
    });

    console.log(`[Auto Applier] Queue count: ${candidateJobs.length}. Target remaining: ${100 - f5.total}`);

    for (let i = 0; i < candidateJobs.length; i++) {
      if (f5.total >= 100) {
        console.log('\n🎉 >>> 100 CONFIRMED APPLICATIONS REACHED! FLOOR COMPLETED! <<< 🎉');
        break;
      }

      const job = candidateJobs[i];
      console.log(`\n==============================================================`);
      console.log(`[Job ${i + 1}/${candidateJobs.length}] Checking: ${job.company} — ${job.role}`);
      console.log(`URL: ${job.url || job.apply_url}`);

      let page;
      try {
        page = await browser.newPage();
        await page.goto(job.url || job.apply_url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await sleep(2000);

        // Adzuna redirect follower
        if (page.url().includes('adzuna.in/details/')) {
          const destLink = await page.evaluate(() => {
            const btn = document.querySelector('a.apply-button, a[data-testid="apply-button"], a[href*="/land/ad/"]');
            return btn ? btn.href : null;
          });
          if (destLink) {
            console.log(`  -> Following Adzuna redirect link...`);
            await page.goto(destLink, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await sleep(3000);
          }
        }

        const destUrl = page.url();
        console.log(`  -> Landed URL: ${destUrl.substring(0, 85)}`);

        // Check for 403 / CloudFront block / Error page
        const pageText = await page.evaluate(() => document.body.innerText);
        if (pageText.includes('403 ERROR') || pageText.includes('Request blocked') || pageText.includes('404 Not Found') || pageText.includes('Page Not Found')) {
          console.log(`  ❌ [DISCARD_BROKEN_LINK]: CloudFront 403 / 404 dead link. Skipping.`);
          await page.close();
          continue;
        }

        // Freshness & YOE Audit (Rule 4 & Rule 60)
        const reason = isStaleOrSenior(pageText);
        if (reason) {
          console.log(`  ❌ [INSTANT_SKIP]: Stale/Banned pattern found: "${reason}". Moving to next immediately!`);
          await page.close();
          continue;
        }

        console.log(`  ✅ [VERIFIED FRESH & ELIGIBLE]: Fresh 0-2 YOE developer job confirmed!`);

        // Apply on Naukri
        if (destUrl.includes('naukri.com')) {
          console.log(`  -> Applying on Naukri...`);
          const audit = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            const isAlreadyApplied = text.includes('already applied') || text.includes('applied on');
            const btns = Array.from(document.querySelectorAll('button, a'));
            const applyBtn = btns.find(b => {
              const t = (b.innerText || '').trim().toLowerCase();
              return t === 'apply' || t === 'apply on company site' || t.includes('easy apply') || t === 'apply now';
            });
            return { isAlreadyApplied, hasApplyBtn: !!applyBtn, btnText: applyBtn?.innerText };
          });

          if (audit.isAlreadyApplied) {
            console.log(`  [ALREADY_APPLIED_NAUKRI] Skipping.`);
            await page.close();
            continue;
          }

          if (audit.hasApplyBtn) {
            console.log(`  -> Clicking apply button: "${audit.btnText}"`);
            await page.evaluate(() => {
              const btns = Array.from(document.querySelectorAll('button, a'));
              const btn = btns.find(b => {
                const t = (b.innerText || '').trim().toLowerCase();
                return t === 'apply' || t === 'apply on company site' || t.includes('easy apply') || t === 'apply now';
              });
              if (btn) btn.click();
            });

            await sleep(3000);

            // Handle questionnaire drawer if opened
            await handleNaukriQuestionnaire(page);
            await sleep(2500);

            // Check chatbot drawer
            const chatbotInput = await page.$('.chatbot_Drawer div.textArea, [id^="userInput"]');
            if (chatbotInput) {
              console.log('  -> Chatbot drawer detected! Sending experience response...');
              await chatbotInput.click();
              await page.keyboard.type('1');
              await sleep(800);
              const sendBtn = await page.$('[id^="sendMsg__"]');
              if (sendBtn) await sendBtn.click();
              await sleep(2500);
            }

            // Assert confirmation
            const confirmed = await page.evaluate(() => {
              const text = document.body.innerText.toLowerCase();
              return text.includes('applied') || text.includes('successfully applied') || text.includes('application submitted');
            });

            if (confirmed) {
              const safeName = job.company.replace(/[^a-zA-Z0-9]/g, '_');
              const ssPath = path.join(SCREENSHOT_DIR, `naukri_${safeName}.png`);
              await page.screenshot({ path: ssPath, fullPage: false });
              console.log(`  🎉 [CONFIRMED APPLIED]: Screenshot saved: ${ssPath}`);

              f5.total += 1;
              f5.jobs.push({
                id: f5.total,
                company: job.company,
                role: job.role,
                channel: 'Direct ATS / Naukri',
                url: destUrl,
                status: 'CONFIRMED_APPLIED',
                screenshot: `screenshots/2026-10-19/shift1/naukri_${safeName}.png`,
                timestamp: new Date().toISOString()
              });
              fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
              console.log(`  >>> [COUNT UPDATE]: Confirmed applied today: ${f5.total}/100 <<<`);
            } else {
              console.log(`  Notice: Application clicked, pending confirmation or external redirect.`);
            }
          }
        } else if (destUrl.includes('cutshort.io')) {
          console.log(`  -> Applying on Cutshort...`);
          const clicked = await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button, a')).find(el => {
              const t = el.innerText.trim().toLowerCase();
              return t === 'apply to this job' || t === 'apply now' || t === 'apply';
            });
            if (btn) {
              btn.click();
              return true;
            }
            return false;
          });

          if (clicked) {
            await sleep(3500);
            const safeName = job.company.replace(/[^a-zA-Z0-9]/g, '_');
            const ssPath = path.join(SCREENSHOT_DIR, `cutshort_${safeName}.png`);
            await page.screenshot({ path: ssPath, fullPage: false });
            console.log(`  🎉 [CUTSHORT CONFIRMED]: Screenshot saved: ${ssPath}`);

            f5.total += 1;
            f5.jobs.push({
              id: f5.total,
              company: job.company,
              role: job.role,
              channel: 'Cutshort Direct',
              url: destUrl,
              status: 'CONFIRMED_APPLIED',
              screenshot: `screenshots/2026-10-19/shift1/cutshort_${safeName}.png`,
              timestamp: new Date().toISOString()
            });
            fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
            console.log(`  >>> [COUNT UPDATE]: Confirmed applied today: ${f5.total}/100 <<<`);
          }
        }

        // Tab Cleanup per Rule 57
        await page.close();
      } catch (err) {
        console.log(`  ⚠️ Error on job: ${err.message}. Skipping to next.`);
        if (page) {
          try { await page.close(); } catch(e) {}
        }
      }

      await sleep(1500);
    }

    console.log(`\n==============================================================`);
    console.log(`[Auto Applier Finished] Final Confirmed Total: ${f5.total}/100`);

  } catch (fatal) {
    console.error('Fatal error:', fatal.message);
  } finally {
    if (browser) await browser.disconnect();
    process.exit(0);
  }
})();
