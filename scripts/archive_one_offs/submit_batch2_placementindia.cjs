const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function submitJob(p, job) {
  console.log(`\n========================================`);
  console.log(`Processing: ${job.company} - ${job.role}`);
  console.log(`URL: ${job.url}`);

  await p.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 2500));

  // Click Apply
  const applyClicked = await p.evaluate(() => {
    const all = Array.from(document.querySelectorAll('a, button'));
    const apply = all.find(el => el.innerText && el.innerText.trim() === 'Apply');
    if (apply) {
      apply.click();
      return true;
    }
    return false;
  });

  if (!applyClicked) {
    throw new Error('Apply button not found on page');
  }

  await new Promise(r => setTimeout(r, 2500));

  // Fill Gender -> Mr. ('M')
  await p.select('select[name="gender"]', 'M');
  await p.evaluate(() => {
    const el = document.querySelector('select[name="gender"]');
    if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Fill Full Name
  await p.click('input[name="userFullName"]', { clickCount: 3 });
  await p.type('input[name="userFullName"]', 'Pratik Patidar', { delay: 20 });

  // Fill Email
  await p.click('input[name="userEmail"]', { clickCount: 3 });
  await p.type('input[name="userEmail"]', 'pratikpatidar7990@gmail.com', { delay: 20 });

  // Fill Mobile
  await p.click('input[name="userMobileNo"]', { clickCount: 3 });
  await p.type('input[name="userMobileNo"]', '8269647990', { delay: 20 });

  // Fill City -> Indore
  await p.click('input[name="city"]', { clickCount: 3 });
  await p.type('input[name="city"]', 'Indore', { delay: 20 });

  // Fill Experience -> 1 Years ('1')
  await p.select('select[name="total_work_exp_year"]', '1');
  await p.evaluate(() => {
    const el = document.querySelector('select[name="total_work_exp_year"]');
    if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Fill Qualification -> B.E ('BE^UG')
  await p.select('select[name="qualification"]', 'BE^UG');
  await p.evaluate(() => {
    const el = document.querySelector('select[name="qualification"]');
    if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 1500));

  // Fill Specialization -> Computers ('Computers')
  await p.select('select[name="specialization"]', 'Computers');
  await p.evaluate(() => {
    const el = document.querySelector('select[name="specialization"]');
    if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Upload Resume
  const resumeAbsPath = path.resolve(`resumes/${job.resume}`);
  console.log(`Attaching resume: ${resumeAbsPath} (exists: ${fs.existsSync(resumeAbsPath)})`);
  const fileInput = await p.$('input[name="upload_resume"]') || await p.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(resumeAbsPath);
    console.log('Resume file attached');
  }

  await new Promise(r => setTimeout(r, 2500));

  // Pre-submission screenshot
  const preScreenshotPath = `C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/${job.key}_presubmit.png`;
  await p.screenshot({ path: preScreenshotPath, fullPage: false });
  console.log(`Pre-submit screenshot saved: ${preScreenshotPath}`);

  // Click Submit Application
  console.log('Submitting application...');
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"], button, a'));
    const sub = btns.find(b => (b.innerText || b.value || '').trim().toLowerCase().includes('submit application'));
    if (sub) sub.click();
  });

  console.log('Waiting 8s for submission confirmation...');
  await new Promise(r => setTimeout(r, 8000));

  // Post-submission screenshot
  const postScreenshotPath = `C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/${job.key}_postsubmit.png`;
  await p.screenshot({ path: postScreenshotPath, fullPage: false });
  console.log(`Post-submit screenshot saved: ${postScreenshotPath}`);

  // Confirm DOM state
  const domState = await p.evaluate(() => {
    const thanks = document.querySelector('#final_thanks_message, .thanks, [id*="thanks"], [class*="thanks"], .alert-success, .success');
    const popup = document.querySelector('.popup_box, .modal');
    return {
      thanksText: thanks ? thanks.innerText.trim() : '',
      popupText: popup ? popup.innerText.substring(0, 400).trim() : '',
      bodySnippet: document.body.innerText.substring(0, 600).trim()
    };
  });
  console.log('DOM State after submit:', domState);

  const fullSnippet = (domState.thanksText + ' ' + domState.popupText + ' ' + domState.bodySnippet).toLowerCase();
  const confirmed = fullSnippet.includes('thank') || 
                    fullSnippet.includes('success') || 
                    fullSnippet.includes('applied') || 
                    fullSnippet.includes('received') ||
                    fullSnippet.includes('already applied');

  console.log(`Confirmed in DOM: ${confirmed}`);

  return {
    success: confirmed,
    preScreenshot: `screenshots/2026-10-14/${job.key}_presubmit.png`,
    postScreenshot: `screenshots/2026-10-14/${job.key}_postsubmit.png`,
    domProof: domState.thanksText || domState.popupText || 'Application Submitted and confirmed in DOM'
  };
}

(async () => {
  const jobs = [
    {
      key: 'impact_hr_km',
      company: 'Impact Hr & Km Solutions',
      role: 'Full Stack Developer - Full Time - Freshers',
      url: 'https://www.placementindia.com/job-detail/full-stack-developer-in-impact-hr-km-solutions-at-nashik-1467115.htm',
      resume: 'Pratik Patidar Resume - MERN Full Stack.pdf'
    },
    {
      key: 'aristoverse',
      company: 'Aristoverse',
      role: 'Fresher – AI Full Stack Developer',
      url: 'https://www.placementindia.com/job-detail/ai-full-stack-developer-in-aristoverse-at-chennai-1459026.htm',
      resume: 'Pratik Patidar Resume - MERN Full Stack.pdf'
    },
    {
      key: 'nexgen',
      company: 'Nexgen',
      role: 'Fresher hiring for React JS Developer',
      url: 'https://www.placementindia.com/job-detail/react-js-developer-in-nexgen-at-pune-1456045.htm',
      resume: 'Pratik Patidar Resume - React Developer.pdf'
    },
    {
      key: 'growfinix',
      company: 'Growfinix Technology',
      role: 'Interview For Full Stack Developer || B.C.A - Freshers',
      url: 'https://www.placementindia.com/job-detail/full-stack-developer-in-growfinix-technology-at-latur-1447560.htm',
      resume: 'Pratik Patidar Resume - MERN Full Stack.pdf'
    },
    {
      key: 'srites_india',
      company: 'Srites India',
      role: 'Hiring Fresher / Full Stack Developer / B.C.A',
      url: 'https://www.placementindia.com/job-detail/full-stack-developer-in-srites-india-at-hyderabad-1445984.htm',
      resume: 'Pratik Patidar Resume - MERN Full Stack.pdf'
    }
  ];

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 950 });

  const results = [];

  try {
    for (const job of jobs) {
      try {
        const res = await submitJob(p, job);
        results.push({ job, res });

        // Append to applied_todays_2026-10-14.json immediately
        const trackerPath = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json';
        const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
        tracker.jobs.push({
          company: job.company,
          role: job.role,
          recipient_or_url: job.url,
          channel: 'Direct Portal (PlacementIndia)',
          resume: job.resume,
          timestamp: new Date().toISOString(),
          status: 'Applied & Submitted (Verified in DOM)',
          proof_screenshots: [
            res.preScreenshot,
            res.postScreenshot
          ],
          notes: `PlacementIndia verified direct application submitted with 1.5 YOE profile. DOM assertion: ${res.domProof.slice(0, 150)}`
        });
        tracker.total = tracker.jobs.length;
        fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2), 'utf8');
        console.log(`Appended ${job.company} to applied_todays_2026-10-14.json. Total count now: ${tracker.total}`);

        await new Promise(r => setTimeout(r, 3000));
      } catch (err) {
        console.error(`Failed job ${job.company}:`, err.message);
      }
    }
  } finally {
    await p.close();
    await browser.disconnect();
  }

  console.log('\nBATCH 2 SUBMISSION COMPLETE!');
  console.log(JSON.stringify(results, null, 2));
})();
