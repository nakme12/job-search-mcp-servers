const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const PROFILE_PATH = path.join(__dirname, '..', 'candidate_screening_profile.json');
const APPLIED_SHIFT2_PATH = path.join(__dirname, '..', 'applied_todays_2026-10-14_shift2.json');
const SHIFT2_SS_DIR = path.join(__dirname, '..', 'screenshots', '2026-10-14', 'shift2');
const profile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8')).profile;

const targets = [
  {
    company: "Training Basket",
    role: "React.js Developer",
    url: "https://in.linkedin.com/jobs/view/react-js-developer-at-training-basket-4477216230"
  },
  {
    company: "Deservely Technologies",
    role: "MERN Stack Developer",
    url: "https://in.linkedin.com/jobs/view/mern-stack-developer-at-deservely-technologies-4472546168"
  }
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runEasyApply() {
  console.log('⚡ [STARTING LINKEDIN EASY APPLY DISPATCHER]');
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });

  let appliedData = { date: '2026-10-14', shift: 2, total: 0, jobs: [] };
  if (fs.existsSync(APPLIED_SHIFT2_PATH)) {
    try { appliedData = JSON.parse(fs.readFileSync(APPLIED_SHIFT2_PATH, 'utf8')); } catch(e) {}
  }

  for (const t of targets) {
    console.log(`\n======================================================`);
    console.log(`Processing: ${t.company} — ${t.role}`);
    console.log(`URL: ${t.url}`);
    console.log(`======================================================`);

    const page = await browser.newPage();
    page.setDefaultTimeout(35000);

    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await sleep(3500);

      const applyBtn = await page.$('.jobs-apply-button--top-card, button[aria-label*="Easy Apply"]');
      if (!applyBtn) {
        console.log(`No Easy Apply button found on ${t.company}. Closing tab.`);
        await page.close();
        continue;
      }

      console.log(`Clicking Easy Apply button for ${t.company}...`);
      await applyBtn.click();
      await sleep(2500);

      let step = 0;
      let submitted = false;

      while (step < 7) {
        step++;
        console.log(`Modal Step ${step}...`);

        // Check Captcha
        const hasCaptcha = await page.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          return text.includes('unusual activity') || text.includes('security check') || !!document.querySelector('iframe[src*="captcha"]');
        });

        if (hasCaptcha) {
          console.log(`🚨 [ALERT] Captcha detected on ${t.company}! Manual intervention required.`);
          break;
        }

        // Fill standard inputs
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

        const state = await page.evaluate(() => {
          const modal = document.querySelector('.jobs-easy-apply-modal');
          if (!modal) return { open: false };
          const submitBtn = modal.querySelector('button[aria-label*="Submit application"], footer button.artdeco-button--primary');
          const nextBtn = modal.querySelector('button[aria-label*="Continue to next step"], button[aria-label*="Review your application"]');
          const text = submitBtn ? submitBtn.innerText.trim() : (nextBtn ? nextBtn.innerText.trim() : '');
          const isSubmit = text.toLowerCase().includes('submit');
          const isNext = text.toLowerCase().includes('next') || text.toLowerCase().includes('review');
          return { open: true, isSubmit, isNext, text };
        });

        if (!state.open) break;

        console.log(`Action button: "${state.text}"`);

        if (state.isSubmit) {
          console.log(`Clicking Submit Application...`);
          await page.evaluate(() => {
            const modal = document.querySelector('.jobs-easy-apply-modal');
            const btn = modal.querySelector('button[aria-label*="Submit application"], footer button.artdeco-button--primary');
            if (btn) btn.click();
          });
          await sleep(4000);

          const conf = await page.evaluate(() => {
            const t = document.body.innerText.toLowerCase();
            return t.includes('application submitted') || t.includes('your application was sent') || t.includes('applied');
          });

          if (conf) {
            console.log(`✅ Application confirmed in DOM for ${t.company}! Saving screenshot...`);
            const safeName = t.company.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const ssName = `${safeName}_postsubmit_${Date.now()}.png`;
            const ssPath = path.join(SHIFT2_SS_DIR, ssName);
            await page.screenshot({ path: ssPath, fullPage: true });

            const record = {
              company: t.company,
              role: t.role,
              recipient_or_url: t.url,
              channel: "LinkedIn Easy Apply (CDP Automation)",
              resume: "Pratik Patidar Resume - MERN Full Stack.pdf",
              timestamp: new Date().toISOString(),
              status: "Applied & Submitted (Verified in DOM: Application Sent)",
              proof_screenshots: [`screenshots/2026-10-14/shift2/${ssName}`],
              notes: "Direct 1-Click / Easy Apply submission confirmed on live LinkedIn DOM. Screenshot proof saved."
            };

            appliedData.jobs.push(record);
            appliedData.total = appliedData.jobs.length;
            fs.writeFileSync(APPLIED_SHIFT2_PATH, JSON.stringify(appliedData, null, 2));
            console.log(`Successfully logged ${t.company} to applied_todays_2026-10-14_shift2.json! Current total: ${appliedData.total}`);
            submitted = true;
            break;
          }
        } else if (state.isNext) {
          await page.evaluate(() => {
            const modal = document.querySelector('.jobs-easy-apply-modal');
            const btn = modal.querySelector('button[aria-label*="Continue to next step"], button[aria-label*="Review your application"], footer button.artdeco-button--primary');
            if (btn) btn.click();
          });
          await sleep(2500);
        } else {
          console.log('Unrecognized button state, breaking.');
          break;
        }
      }

      await page.close();
    } catch(err) {
      console.error(`Error on ${t.company}:`, err.message);
      try { await page.close(); } catch(e) {}
    }

    await sleep(2000);
  }

  console.log('🏁 [EASY APPLY DISPATCH ROUTINE FINISHED]');
}

runEasyApply().catch(console.error);
