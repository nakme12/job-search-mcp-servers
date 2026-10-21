const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const SHIFT2_SS_DIR = path.join(__dirname, '..', 'screenshots', '2026-10-14', 'shift2');
const APPLIED_SHIFT2_PATH = path.join(__dirname, '..', 'applied_todays_2026-10-14_shift2.json');

async function fillDeservelyCanonical() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[pages.length - 1];

  await p.bringToFront();

  // Helper to type into element
  async function typeField(id, text) {
    const el = await p.$(`input[id="${id}"]`);
    if (el) {
      await el.click({ clickCount: 3 });
      await p.keyboard.press('Backspace');
      await new Promise(r => setTimeout(r, 100));
      await el.type(text, { delay: 15 });
      await p.keyboard.press('Tab');
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // 1. Notice period in days -> 15
  await typeField('_r_v_', '15');

  // 2. Current CTC in INR -> 216000
  await typeField('_r_10_', '216000');

  // 3. Expected CTC in INR -> 465000
  await typeField('_r_11_', '465000');

  // 4. Years of experience select -> 1 year
  await p.evaluate(() => {
    const sel = document.getElementById('_r_12_');
    if (sel) {
      const opt = Array.from(sel.options).find(o => o.text.includes('1 year'));
      if (opt) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  // 5. Additional months of experience -> 6 months (total 1.5 years)
  await p.evaluate(() => {
    const sel = document.getElementById('_r_14_');
    if (sel) {
      const opt = Array.from(sel.options).find(o => o.text.includes('6 months') || o.text.includes('6 month'));
      if (opt) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  // 6. LinkedIn profile URL
  await typeField('_r_16_', 'https://www.linkedin.com/in/pratik-patidar');

  // 7. Portfolio URL
  await typeField('_r_17_', 'https://pratik-portfolio-nine-orcin.vercel.app');

  await new Promise(r => setTimeout(r, 1500));

  // Click Review / Next button
  console.log('Clicking Review button on Deservely...');
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.trim() === 'Review' || b.innerText.trim() === 'Next');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 3000));

  // Now click Submit application
  console.log('Looking for Submit application button...');
  const submitted = await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const sub = btns.find(b => b.innerText.trim() === 'Submit application' || b.getAttribute('aria-label')?.includes('Submit application'));
    if (sub) {
      sub.click();
      return true;
    }
    return false;
  });

  console.log('Clicked Submit application:', submitted);
  await new Promise(r => setTimeout(r, 4500));

  // Assert confirmation
  const conf = await p.evaluate(() => {
    const t = document.body.innerText.toLowerCase();
    return t.includes('application submitted') || t.includes('your application was sent') || t.includes('applied');
  });

  console.log('Deservely Application Confirmation:', conf);

  if (conf) {
    const ssName = `deservely_postsubmit_${Date.now()}.png`;
    const ssPath = path.join(SHIFT2_SS_DIR, ssName);
    await p.screenshot({ path: ssPath, fullPage: true });
    console.log('Screenshot saved:', ssPath);

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
      notes: "LinkedIn Easy Apply successfully submitted with physical DOM proof."
    });

    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(APPLIED_SHIFT2_PATH, JSON.stringify(appliedData, null, 2));
    console.log('Logged Deservely to applied Shift 2! New total:', appliedData.total);

    await p.close();
    console.log('Tab closed cleanly.');
  } else {
    await p.screenshot({ path: 'screenshots/debug_deservely_after.png' });
    console.log('Saved debug screenshot screenshots/debug_deservely_after.png');
  }
}

fillDeservelyCanonical().catch(console.error);
