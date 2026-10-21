import puppeteer from 'puppeteer-core';
import fs from 'fs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function applyJobaaj() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('naukri.com')) || pages[0];

  const targetUrl = 'https://www.naukri.com/job-listings-mern-stack-developer-jobaaj-com-pune-0-to-2-years-121026000824';
  console.log(`Navigating to Jobaaj com: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(4000);

  // Deep check JD details before clicking
  const jdInfo = await page.evaluate(() => {
    const h1 = document.querySelector('h1')?.innerText?.trim() || '';
    const comp = document.querySelector('a.styles_jd-header-comp-name__a__, .comp-name')?.innerText?.trim() || '';
    const exp = document.querySelector('.styles_jhc__exp__ span, .styles_jhc__exp__')?.innerText?.trim() || '';
    const applyBtn = document.querySelector('.apply-button, button[id*="apply"], .styles_apply-button__W4t0d');
    const btnText = applyBtn ? applyBtn.innerText.trim() : 'NO_BTN_FOUND';
    const isAlreadyApplied = document.body.innerText.includes('already applied') || document.body.innerText.includes('Already Applied');
    return { h1, comp, exp, btnText, isAlreadyApplied };
  });

  console.log('JD Details on Live DOM:', JSON.stringify(jdInfo, null, 2));

  if (jdInfo.isAlreadyApplied) {
    console.log('Already applied according to page text!');
    browser.disconnect();
    return;
  }

  // Click Apply
  console.log(`Clicking Apply button ('${jdInfo.btnText}')...`);
  const applyClicked = await page.evaluate(() => {
    const btn = document.querySelector('.apply-button, button[id*="apply"], .styles_apply-button__W4t0d');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  console.log('Apply button clicked:', applyClicked);
  await sleep(5000);

  // Check post-click DOM for success / chatbot / modal
  const postClickState = await page.evaluate(() => {
    const text = document.body.innerText;
    const hasSuccess = text.includes('successfully applied') || text.includes('Application sent') || text.includes('Applied successfully') || text.includes('already applied');
    const chatbot = document.querySelector('.chatbot_drawer, [class*="chatbot"], .apply-message');
    const modalText = chatbot ? chatbot.innerText : '';
    return { hasSuccess, modalSnippet: modalText.slice(0, 300) };
  });

  console.log('Post-Click DOM State:', JSON.stringify(postClickState, null, 2));
  browser.disconnect();
}

applyJobaaj().catch(console.error);
