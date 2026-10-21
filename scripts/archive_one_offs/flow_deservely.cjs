const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const SHIFT2_SS_DIR = path.join(__dirname, '..', 'screenshots', '2026-10-14', 'shift2');
const APPLIED_SHIFT2_PATH = path.join(__dirname, '..', 'applied_todays_2026-10-14_shift2.json');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function autoFlowDeservely() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[pages.length - 1];

  console.log('⚡ [EXECUTING DESERVELY TECHNOLOGIES FLOW]');
  let step = 0;
  let submitted = false;

  while (step < 9) {
    step++;
    console.log(`\n--- Step ${step} ---`);

    // Select India (+91)
    await p.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const sel of selects) {
        const opt = Array.from(sel.options).find(o => o.text.includes('+91') || o.text.includes('India'));
        if (opt && sel.value !== opt.value) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Fill common inputs
      const inputs = Array.from(document.querySelectorAll('input'));
      for (const inp of inputs) {
        const parent = inp.closest('.fb-dash-form-element') || inp.parentElement;
        const text = parent ? parent.innerText.toLowerCase() : '';
        const aria = (inp.getAttribute('aria-label') || '').toLowerCase();

        if ((text.includes('phone') || aria.includes('phone')) && !inp.value) {
          inp.value = '8269647990';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        } else if ((text.includes('city') || aria.includes('city')) && !inp.value) {
          inp.value = 'Indore';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        } else if ((text.includes('experience') || text.includes('years of')) && !inp.value) {
          inp.value = '2';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        } else if ((text.includes('notice') || aria.includes('notice')) && !inp.value) {
          inp.value = '15';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (text.includes('linkedin') && !inp.value) {
          inp.value = 'https://www.linkedin.com/in/pratik-patidar';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });

    await sleep(1500);

    // Check button state
    const btnInfo = await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sub = btns.find(b => b.innerText.trim() === 'Submit application' || b.getAttribute('aria-label')?.includes('Submit application'));
      const rev = btns.find(b => b.innerText.trim() === 'Review' || b.getAttribute('aria-label')?.includes('Review'));
      const nxt = btns.find(b => b.innerText.trim() === 'Next' || b.getAttribute('aria-label')?.includes('Next'));

      if (sub) return { type: 'SUBMIT', elText: sub.innerText.trim() };
      if (rev) return { type: 'REVIEW', elText: rev.innerText.trim() };
      if (nxt) return { type: 'NEXT', elText: nxt.innerText.trim() };
      return { type: 'NONE' };
    });

    console.log('Action Button Detected:', btnInfo.type, btnInfo.elText);

    if (btnInfo.type === 'SUBMIT') {
      console.log('Clicking Submit application...');
      await p.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const sub = btns.find(b => b.innerText.trim() === 'Submit application' || b.getAttribute('aria-label')?.includes('Submit application'));
        if (sub) sub.click();
      });
      await sleep(4500);

      const conf = await p.evaluate(() => {
        const t = document.body.innerText.toLowerCase();
        return t.includes('application submitted') || t.includes('your application was sent') || t.includes('applied');
      });

      if (conf) {
        console.log('✅ Deservely submission confirmed in DOM! Capturing screenshot...');
        const ssName = `deservely_postsubmit_${Date.now()}.png`;
        const ssPath = path.join(SHIFT2_SS_DIR, ssName);
        await p.screenshot({ path: ssPath, fullPage: true });

        let appliedData = { date: '2026-10-14', shift: 2, total: 0, jobs: [] };
        if (fs.existsSync(APPLIED_SHIFT2_PATH)) {
          try { appliedData = JSON.parse(fs.readFileSync(APPLIED_SHIFT2_PATH, 'utf8')); } catch(e) {}
        }

        appliedData.jobs.push({
          company: "Deservely Technologies",
          role: "MERN Stack Developer",
          recipient_or_url: "https://in.linkedin.com/jobs/view/mern-stack-developer-at-deservely-technologies-4472546168",
          channel: "LinkedIn Easy Apply",
          resume: "Pratik Patidar Resume - MERN Full Stack.pdf",
          timestamp: new Date().toISOString(),
          status: "Applied & Submitted (Verified in DOM: Application Sent)",
          proof_screenshots: [`screenshots/2026-10-14/shift2/${ssName}`],
          notes: "LinkedIn Easy Apply confirmed submitted with physical DOM proof."
        });

        appliedData.total = appliedData.jobs.length;
        fs.writeFileSync(APPLIED_SHIFT2_PATH, JSON.stringify(appliedData, null, 2));
        console.log('Successfully recorded Deservely Technologies! Shift 2 total:', appliedData.total);
        submitted = true;
        await p.close();
        break;
      }
    } else if (btnInfo.type === 'NEXT' || btnInfo.type === 'REVIEW') {
      console.log(`Clicking ${btnInfo.type}...`);
      await p.evaluate((t) => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => b.innerText.trim() === t || b.getAttribute('aria-label')?.includes(t));
        if (target) target.click();
      }, btnInfo.elText);
      await sleep(2500);
    } else {
      console.log('No progress button found. Page text snippet:\n', (await p.evaluate(() => document.body.innerText)).substring(0, 400));
      break;
    }
  }

  console.log('Deservely flow finished. Submitted:', submitted);
}

autoFlowDeservely().catch(console.error);
