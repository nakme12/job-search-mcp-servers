import puppeteer from 'puppeteer-core';
import fs from 'fs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const naukriJobsToApply = [
  {
    company: "Jobaaj com",
    role: "Mern Stack Developer",
    exp: "0-2 Yrs",
    location: "Remote (Pune)",
    url: "https://www.naukri.com/job-listings-mern-stack-developer-jobaaj-com-pune-0-to-2-years-121026000824"
  },
  {
    company: "innovantes IT",
    role: "React Js Frontend Developer",
    exp: "0-2 Yrs",
    location: "Chandigarh",
    url: "https://www.naukri.com/job-listings-react-js-frontend-developer-innovantes-it-chandigarh-0-to-2-years-131026018710"
  },
  {
    company: "Ignitefortune Tech",
    role: "Java Full Stack Developer (React)",
    exp: "0-1 Yrs",
    location: "Remote",
    url: "https://www.naukri.com/job-listings-java-full-stack-developer-react-ignitefortune-tech-pune-0-to-1-years-131026000406"
  },
  {
    company: "Creative Hands HR",
    role: "Junior Developer",
    exp: "0-2 Yrs",
    location: "Bengaluru, Chennai, Hyderabad",
    url: "https://www.naukri.com/job-listings-junior-developer-creative-hands-hr-hyderabad-chennai-bengaluru-0-to-2-years-121026002003"
  }
];

async function runSequentialNaukriApply() {
  console.log('Connecting to Chrome on port 9222...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('naukri.com')) || pages[0];

  const appliedLogPath = 'weekly_applied.json';
  const appliedData = JSON.parse(fs.readFileSync(appliedLogPath, 'utf8'));

  for (let i = 0; i < naukriJobsToApply.length; i++) {
    const job = naukriJobsToApply[i];
    console.log(`\n==================================================`);
    console.log(`[${i + 1}/${naukriJobsToApply.length}] Processing: ${job.company} - ${job.role}`);
    console.log(`URL: ${job.url}`);

    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3500);

      // Verify page content and apply button
      const pageState = await page.evaluate(() => {
        const title = document.querySelector('h1')?.innerText?.trim() || document.title;
        const exp = document.querySelector('.styles_jhc__exp__ span, .styles_jhc__exp__')?.innerText?.trim() || '';
        const bodyText = document.body.innerText;
        const isAlreadyApplied = bodyText.includes('already applied') || bodyText.includes('Applied to');
        
        const btn = document.querySelector('.apply-button, button[id*="apply"], .styles_apply-button__W4t0d');
        const btnText = btn ? btn.innerText.trim() : 'NO_BTN';
        return { title, exp, isAlreadyApplied, btnText };
      });

      console.log(`DOM Pre-Check: Title: "${pageState.title}", Exp: "${pageState.exp}", Btn: "${pageState.btnText}", AlreadyApplied: ${pageState.isAlreadyApplied}`);

      if (pageState.isAlreadyApplied) {
        console.log(`Already applied previously on Naukri! Skipping click.`);
        continue;
      }

      if (pageState.btnText === 'Apply' || pageState.btnText.toLowerCase().includes('apply')) {
        console.log(`Clicking Apply button...`);
        await page.evaluate(() => {
          const btn = document.querySelector('.apply-button, button[id*="apply"], .styles_apply-button__W4t0d');
          if (btn) btn.click();
        });

        await sleep(5000);

        // Verify post-click state
        const postClick = await page.evaluate(() => {
          const url = window.location.href;
          const body = document.body.innerText;
          const success = url.includes('saveApply') || body.includes('Applied to') || body.includes('Application sent') || body.includes('successfully applied');
          const snippet = body.slice(0, 300).replace(/\s+/g, ' ');
          return { url, success, snippet };
        });

        console.log(`Post-Click Verification: Success: ${postClick.success}`);
        console.log(`Current URL: ${postClick.url}`);

        if (postClick.success) {
          const newEntry = {
            id: `naukri-${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`,
            company: job.company,
            role: job.role,
            location: job.location,
            applied_at: new Date().toISOString(),
            method: "naukri_direct_apply",
            status: "applied",
            url: job.url,
            verified: true,
            notes: `Rule 51 verified in live DOM: ${postClick.url}`
          };

          appliedData.applied.push(newEntry);
          appliedData.total_lifetime_applied = appliedData.applied.length;
          fs.writeFileSync(appliedLogPath, JSON.stringify(appliedData, null, 2));
          console.log(`>>> RECORDED TO weekly_applied.json successfully!`);
        } else {
          console.log(`Could not assert physical success text. Not recording to applied list.`);
        }
      } else {
        console.log(`Apply button not in 1-Click state (Text: ${pageState.btnText}). Skipping.`);
      }

    } catch (err) {
      console.error(`Error applying to ${job.company}:`, err.message);
    }
  }

  browser.disconnect();
  console.log(`\n==================================================`);
  console.log(`Naukri Batch Finished.`);
}

runSequentialNaukriApply().catch(console.error);
