const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const RESUME_PATH = path.resolve('D:/adi/mcp/Pratik Patidar Resume - React Developer.pdf');

async function main() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  console.log(`Found ${pages.length} pages:`);
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    console.log(`[${i}] ${await page.title()} -> ${page.url()}`);
  }

  // Let's inspect each job page
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const url = page.url();
    const title = await page.title();

    if (url.includes('linkedin.com/jobs/view')) {
      console.log(`\n=== Checking LinkedIn Job Tab: ${title} (${url}) ===`);
      // check JD text, experience requirement, Easy Apply button
      const details = await page.evaluate(() => {
        const jobTitle = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1')?.innerText?.trim();
        const company = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__primary-description')?.innerText?.trim();
        const jd = document.querySelector('#job-details, .jobs-description__content, .jobs-box__html-content')?.innerText?.trim() || '';
        const easyApplyBtn = document.querySelector('.jobs-apply-button--top-card button, .jobs-apply-button, button.jobs-apply-button');
        const easyApplyText = easyApplyBtn ? easyApplyBtn.innerText.trim() : 'NO EASY APPLY BTN';
        return { jobTitle, company, jdLength: jd.length, jdPreview: jd.substring(0, 300), easyApplyText };
      });
      console.log(details);
    } else if (url.includes('career.infosys.com') || url.includes('foundit.in')) {
      console.log(`\n=== Checking Infosys / Foundit Tab: ${title} (${url}) ===`);
      const details = await page.evaluate(() => {
        const h1 = document.querySelector('h1')?.innerText?.trim();
        const buttons = Array.from(document.querySelectorAll('button, a')).filter(el => {
          const t = el.innerText.toLowerCase();
          return t.includes('apply') || t.includes('submit') || t.includes('login');
        }).map(el => ({ text: el.innerText.trim(), tag: el.tagName, href: el.href || null }));
        return { h1, buttons };
      });
      console.log(details);
    }
  }

  browser.disconnect();
}

main().catch(console.error);
