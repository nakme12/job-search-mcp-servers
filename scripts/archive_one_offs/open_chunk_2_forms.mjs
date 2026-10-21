import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  
  // 1. Open Foundit Infosys Tab
  const p1 = await browser.newPage();
  console.log('Opening Form 1: Infosys on Foundit...');
  await p1.goto('https://www.foundit.in/seeker/single-page-registration?from=adzuna&spl=IN_paid_job_boards_acq_affiliates_adzuna_Feed&gd=1&jobid=155240411&action=apply&utm_campaign=IN_paid_job_boards_acq_affiliates_adzuna_Feed&utm_medium=affiliates&utm_source=adzuna', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // 2. Open Capital Placement Services Tab
  const p2 = await browser.newPage();
  console.log('Opening Form 2: Capital Placement Services on PlacementIndia...');
  await p2.goto('https://www.placementindia.com/job-detail/angular-developer-jobs-in-gurugram-for-capital-placement-services-1069174.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Trigger apply button on PlacementIndia tab
  await p2.evaluate(() => {
    const btn = document.querySelector('a#applyJob, a.btn-dark');
    if (btn) btn.click();
  });

  console.log('Both tabs opened and active!');
  await browser.disconnect();
})();
