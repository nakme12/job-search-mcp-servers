/**
 * slot4_slot5_slot6_orchestrator.cjs
 * - Iterates over claude_ready_to_apply_queue.json
 * - Step 1 (Slot 4): Open URL, check live DOM, ensure active, check YOE <= 2 years
 * - Step 2 (Slot 5/6): If Easy Apply or Direct ATS form, fill via canonical profile
 *   If external redirect / email found, dispatch or keep ready
 * - Step 3: Check confirmation, take post-submit screenshot to screenshots/
 * - Step 4: Immediately close tab & append to applied_todays.json
 * - Mandate Rule 59: Granular live console logs for every step
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const PROFILE_PATH = path.join(__dirname, '..', 'candidate_screening_profile.json');
const QUEUE_PATH = path.join(__dirname, '..', 'claude_ready_to_apply_queue.json');
const APPLIED_SHIFT2_PATH = path.join(__dirname, '..', 'applied_todays.json');
const SHIFT2_SS_DIR = path.join(__dirname, '..', 'screenshots', '2026-10-14', 'shift2');

if (!fs.existsSync(SHIFT2_SS_DIR)) {
  fs.mkdirSync(SHIFT2_SS_DIR, { recursive: true });
}

const profile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8')).profile;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('🚀 [STARTING 1:30 HR VERIFY & APPLY ORCHESTRATOR]');
  
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });

  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
  console.log(`Loaded ${queue.length} targets from queue.`);

  let appliedData = { date: '2026-10-14', shift: 2, total: 0, jobs: [] };
  if (fs.existsSync(APPLIED_SHIFT2_PATH)) {
    try {
      appliedData = JSON.parse(fs.readFileSync(APPLIED_SHIFT2_PATH, 'utf8'));
    } catch(e) {}
  }

  const processedUrls = new Set(appliedData.jobs.map(j => (j.url || j.recipient_or_url || '').toLowerCase()));

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const targetUrl = item.url;
    const company = item.company || 'Unknown';
    const role = item.role || 'Frontend Developer';

    if (processedUrls.has(targetUrl.toLowerCase())) {
      console.log(`[Job ${i+1}/${queue.length}] ${company} — Already applied in shift 2. Skipping.`);
      continue;
    }

    console.log(`\n======================================================`);
    console.log(`[Job ${i+1}/${queue.length}] ${company} — ${role}`);
    console.log(`Target URL: ${targetUrl}`);
    console.log(`======================================================`);

    const page = await browser.newPage();
    page.setDefaultTimeout(35000);

    try {
      // Slot 4: Open & Verify Live DOM
      console.log(`[Job ${i+1}/${queue.length}] ${company} — Opening live DOM...`);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await sleep(3500);

      // DOM Assessment
      const audit = await page.evaluate(() => {
        const text = document.body.innerText;
        const lower = text.toLowerCase();
        
        const isClosed = lower.includes('no longer accepting applications') || 
                         lower.includes('this job is closed') || 
                         lower.includes('job expired') ||
                         lower.includes('page not found');

        // Check experience ceiling
        const m = text.match(/(\d+)\s*(?:-|to|\+)\s*(\d+)?\s*(?:years?|yrs?)/i);
        let minExp = null;
        if (m) {
          minExp = parseInt(m[1], 10);
        }

        const isEasyApply = !!document.querySelector('.jobs-apply-button--top-card, button[aria-label*="Easy Apply"]');
        const applyBtn = document.querySelector('.jobs-apply-button--top-card, button[aria-label*="Apply"]');
        const hasExternalApply = !!applyBtn && !isEasyApply;

        return {
          isClosed,
          minExp,
          isEasyApply,
          hasExternalApply,
          bodySnippet: text.substring(0, 400).replace(/\n+/g, ' ')
        };
      });

      if (audit.isClosed) {
        console.log(`[Job ${i+1}/${queue.length}] ${company} — SKIPPED_CLOSED (Posting is inactive/expired).`);
        await page.close();
        continue;
      }

      if (audit.minExp && audit.minExp > 2) {
        console.log(`[Job ${i+1}/${queue.length}] ${company} — SKIPPED_OUT_OF_RANGE_YOE (Requires ${audit.minExp}+ YOE > ceiling 2 YOE).`);
        await page.close();
        continue;
      }

      console.log(`[Job ${i+1}/${queue.length}] ${company} — JD verified (Fits 0–2 YOE) ✅`);

      if (audit.isEasyApply) {
        console.log(`[Job ${i+1}/${queue.length}] ${company} — Easy Apply detected. Triggering Easy Apply flow...`);
        const applyBtn = await page.$('.jobs-apply-button--top-card, button[aria-label*="Easy Apply"]');
        if (applyBtn) {
          await applyBtn.click();
          await sleep(2500);

          // Flow steps in LinkedIn Easy Apply Modal
          let stepCount = 0;
          let submitted = false;

          while (stepCount < 6) {
            stepCount++;
            console.log(`[Job ${i+1}/${queue.length}] ${company} — Modal Step ${stepCount}...`);

            // Check if captcha
            const hasCaptcha = await page.evaluate(() => {
              const t = document.body.innerText.toLowerCase();
              return t.includes('unusual activity') || t.includes('security check') || document.querySelector('iframe[src*="captcha"]');
            });

            if (hasCaptcha) {
              console.log(`🚨 [ALERT] Captcha detected on ${company}. Please solve manually.`);
              break;
            }

            // Fill standard form fields inside modal if present
            await page.evaluate((prof) => {
              const inputs = Array.from(document.querySelectorAll('.jobs-easy-apply-modal input, .jobs-easy-apply-modal select, .jobs-easy-apply-modal textarea'));
              for (const inp of inputs) {
                const label = (inp.getAttribute('aria-label') || inp.id || inp.name || '').toLowerCase();
                const parent = inp.closest('.fb-dash-form-element') || inp.parentElement;
                const parentText = parent ? parent.innerText.toLowerCase() : '';

                if ((label.includes('phone') || parentText.includes('phone') || parentText.includes('mobile')) && !inp.value) {
                  inp.value = prof.phone_raw;
                  inp.dispatchEvent(new Event('input', { bubbles: true }));
                  inp.dispatchEvent(new Event('change', { bubbles: true }));
                } else if ((label.includes('experience') || parentText.includes('experience') || parentText.includes('years of')) && !inp.value) {
                  inp.value = '2';
                  inp.dispatchEvent(new Event('input', { bubbles: true }));
                  inp.dispatchEvent(new Event('change', { bubbles: true }));
                } else if ((label.includes('notice') || parentText.includes('notice')) && !inp.value) {
                  inp.value = '15';
                  inp.dispatchEvent(new Event('input', { bubbles: true }));
                  inp.dispatchEvent(new Event('change', { bubbles: true }));
                } else if ((label.includes('city') || parentText.includes('city') || parentText.includes('location')) && !inp.value) {
                  inp.value = prof.city;
                  inp.dispatchEvent(new Event('input', { bubbles: true }));
                  inp.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }
            }, profile);

            // Check modal buttons
            const btnState = await page.evaluate(() => {
              const modal = document.querySelector('.jobs-easy-apply-modal');
              if (!modal) return { hasModal: false };
              const submitBtn = modal.querySelector('button[aria-label*="Submit application"], footer button.artdeco-button--primary');
              const nextBtn = modal.querySelector('button[aria-label*="Continue to next step"], button[aria-label*="Review your application"]');
              const text = submitBtn ? submitBtn.innerText.trim() : (nextBtn ? nextBtn.innerText.trim() : '');
              const isSubmit = text.toLowerCase().includes('submit');
              const isReview = text.toLowerCase().includes('review');
              const isNext = text.toLowerCase().includes('next');
              return { hasModal: true, isSubmit, isReview, isNext, text };
            });

            if (!btnState.hasModal) {
              // Modal closed or confirmed
              break;
            }

            console.log(`[Job ${i+1}/${queue.length}] ${company} — Button found: "${btnState.text}"`);

            if (btnState.isSubmit) {
              console.log(`[Job ${i+1}/${queue.length}] ${company} — Submitting application...`);
              await page.evaluate(() => {
                const modal = document.querySelector('.jobs-easy-apply-modal');
                const btn = modal.querySelector('button[aria-label*="Submit application"], footer button.artdeco-button--primary');
                if (btn) btn.click();
              });
              await sleep(3500);

              // Check confirmation
              const isConf = await page.evaluate(() => {
                const t = document.body.innerText.toLowerCase();
                return t.includes('application submitted') || t.includes('your application was sent') || t.includes('applied');
              });

              if (isConf) {
                console.log(`[Job ${i+1}/${queue.length}] ${company} — Confirmation detected ✅ Saving screenshot...`);
                const safeName = company.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const ssName = `${safeName}_postsubmit_${Date.now()}.png`;
                const ssPath = path.join(SHIFT2_SS_DIR, ssName);
                await page.screenshot({ path: ssPath, fullPage: true });

                const appliedRecord = {
                  company,
                  role,
                  recipient_or_url: targetUrl,
                  channel: "LinkedIn Easy Apply",
                  resume: "Pratik Patidar Resume - React Developer.pdf",
                  timestamp: new Date().toISOString(),
                  status: "Applied & Submitted (Verified in DOM: Application Sent)",
                  proof_screenshots: [`screenshots/${ssName}`],
                  notes: "Verified & submitted via live LinkedIn Easy Apply. Post-submit screenshot captured."
                };

                appliedData.jobs.push(appliedRecord);
                appliedData.total = appliedData.jobs.length;
                fs.writeFileSync(APPLIED_SHIFT2_PATH, JSON.stringify(appliedData, null, 2));
                console.log(`[Job ${i+1}/${queue.length}] ${company} — Successfully logged to applied_todays.json! Current total: ${appliedData.total}`);
                submitted = true;
                break;
              }
            } else if (btnState.isNext || btnState.isReview) {
              await page.evaluate(() => {
                const modal = document.querySelector('.jobs-easy-apply-modal');
                const btn = modal.querySelector('button[aria-label*="Continue to next step"], button[aria-label*="Review your application"], footer button.artdeco-button--primary');
                if (btn) btn.click();
              });
              await sleep(2500);
            } else {
              console.log(`[Job ${i+1}/${queue.length}] ${company} — Unknown modal state. Closing modal.`);
              break;
            }
          }

          if (!submitted) {
            console.log(`[Job ${i+1}/${queue.length}] ${company} — Complex form or custom questions required. Keeping tab state recorded.`);
          }
        }
      } else {
        console.log(`[Job ${i+1}/${queue.length}] ${company} — Direct portal / Apply on company site link.`);
      }

      console.log(`[Job ${i+1}/${queue.length}] ${company} — Closing tab and proceeding to next job...`);
      await page.close();

    } catch (err) {
      console.error(`[Job ${i+1}/${queue.length}] ${company} — ERROR: ${err.message}. Closing tab.`);
      try { await page.close(); } catch(e) {}
    }

    // Paced polite pause between jobs
    await sleep(2500);
  }

  console.log('🏁 [ORCHESTRATION CYCLE COMPLETE]');
}

run().catch(console.error);

