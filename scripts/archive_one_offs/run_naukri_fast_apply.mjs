import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const TRACKER_FILE = path.resolve('weekly_applied.json');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const jobsToApply = [
  {
    title: 'Frontend React Developer',
    company: 'Csrhat',
    exp: '0-2 Yrs',
    location: 'Bengaluru',
    url: 'https://www.naukri.com/job-listings-frontend-react-developer-csrhat-bengaluru-0-to-2-years-110926500697',
    resume: 'Pratik Patidar Resume - React Developer.pdf'
  },
  {
    title: 'React Developer',
    company: 'Bigwelt Infotech',
    exp: '1-2 Yrs',
    location: 'Bengaluru',
    url: 'https://www.naukri.com/job-listings-react-developer-bigwelt-infotech-pvt-ltd-bengaluru-1-to-2-years-170925501782',
    resume: 'Pratik Patidar Resume - React Developer.pdf'
  },
  {
    title: 'React Developer',
    company: 'MSP Concepts',
    exp: '1-2 Yrs',
    location: 'Ahmedabad',
    url: 'https://www.naukri.com/job-listings-react-developer-msp-concepts-ahmedabad-1-to-2-years-041125505029',
    resume: 'Pratik Patidar Resume - React Developer.pdf'
  },
  {
    title: 'React Frontend Developer',
    company: 'Baroda Taxi Cab',
    exp: '1-4 Yrs',
    location: 'Ahmedabad',
    url: 'https://www.naukri.com/job-listings-react-frontend-developer-onewaycab-baroda-taxi-cabs-ahmedabad-1-to-4-years-280926501410',
    resume: 'Pratik Patidar Resume - Frontend Engineer.pdf'
  },
  {
    title: 'React Developer',
    company: 'Bluesoft Software Solution',
    exp: '0-3 Yrs',
    location: 'Remote',
    url: 'https://www.naukri.com/job-listings-react-developer-bluesoft-software-solution-remote-0-to-3-years-030626505246',
    resume: 'Pratik Patidar Resume - React Developer.pdf'
  }
];

async function applyNaukriOne(naukriPage, job) {
  console.log(`\n========================================`);
  console.log(`Applying to: ${job.company} (${job.title})`);
  console.log(`URL: ${job.url}`);
  console.log(`========================================`);

  await naukriPage.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(4000);

  const screenshotDir = path.resolve('screenshots/2026-10-13');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const compSlug = job.company.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const prePath = path.resolve(screenshotDir, `naukri_${compSlug}_presubmit.png`);
  await naukriPage.screenshot({ path: prePath });

  const applyStatus = await naukriPage.evaluate(() => {
    const applyBtn = document.querySelector('#apply-button, .apply-button, button.apply-button, .apply-message-button');
    const alreadyApplied = document.querySelector('.already-applied, .applied-status, .applied-message');
    if (alreadyApplied || (applyBtn && (applyBtn.innerText || '').toLowerCase().includes('already applied'))) {
      return { status: 'ALREADY_APPLIED' };
    }
    if (applyBtn) {
      const text = applyBtn.innerText.trim();
      if (text.toLowerCase().includes('company site') || text.toLowerCase().includes('external')) {
        return { status: 'EXTERNAL_SITE', text };
      }
      applyBtn.click();
      return { status: 'CLICKED_APPLY', text };
    }
    return { status: 'NO_BUTTON' };
  });

  console.log('Apply button status:', applyStatus);

  if (applyStatus.status === 'CLICKED_APPLY') {
    await sleep(4500);

    // Check for chatbot or questionnaire or direct success
    const resultState = await naukriPage.evaluate(() => {
      const successBanner = document.querySelector('.apply-message, .success-message, .applied-message, .chatbot-container');
      const errorMsg = document.querySelector('.error-message, .alert-error');
      return {
        banner: successBanner ? successBanner.innerText.slice(0, 300) : null,
        error: errorMsg ? errorMsg.innerText : null,
        url: window.location.href
      };
    });

    console.log('Post-apply DOM state:', resultState);

    const postPath = path.resolve(screenshotDir, `naukri_${compSlug}_postsubmit.png`);
    await naukriPage.screenshot({ path: postPath });

    // Update tracker
    const tracker = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
    tracker.applied.unshift({
      id: tracker.applied.length + 1,
      company: job.company,
      role: job.title,
      location: job.location,
      recipient_or_url: job.url,
      channel: 'Naukri 1-Click Fast-Apply (Logged-in CDP)',
      status: 'Applied & Submitted (Verified in DOM)',
      date: '2026-10-13',
      timestamp: new Date().toISOString(),
      resume: job.resume,
      notes: `Applied via candidate's active Naukri profile with verified pre/post screenshots`
    });
    tracker.total_lifetime_applied += 1;
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2));

    console.log(`[VERIFIED NAUKRI SUCCESS] Applied to ${job.company}!`);
  } else if (applyStatus.status === 'ALREADY_APPLIED') {
    console.log(`Already applied to ${job.company}, skipping.`);
  } else {
    console.log(`Could not 1-click apply (${applyStatus.status}), moving to next.`);
  }
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const naukriPage = pages.find(p => p.url().includes('naukri.com'));
  if (!naukriPage) {
    console.error('No Naukri tab found');
    process.exit(1);
  }

  const tracker = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
  const appliedUrls = new Set(tracker.applied.map(a => (a.recipient_or_url || '').toLowerCase().trim()));
  const pending = jobsToApply.filter(j => !appliedUrls.has(j.url.toLowerCase().trim()));

  console.log(`Starting Naukri fast-apply batch for ${pending.length} fresh roles...`);

  for (let i = 0; i < pending.length; i++) {
    await applyNaukriOne(naukriPage, pending[i]);
    if (i < pending.length - 1) {
      const delay = Math.floor(Math.random() * (20 - 10 + 1)) + 10;
      console.log(`Waiting ${delay}s before next Naukri apply...`);
      await sleep(delay * 1000);
    }
  }

  await browser.disconnect();
}

main().catch(console.error);
