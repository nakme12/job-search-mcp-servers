/**
 * INTERACTIVE RUNNER ON EXISTING OPEN ADZUNA TAB
 * Attaches to the active Adzuna tab you are looking at and prints live step-by-step logs with 3s delays.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runInteractiveOnOpenTab() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('adzuna.in'));

  if (!page) {
    console.log('❌ Adzuna tab not found in browser!');
    return;
  }

  console.log('======================================================');
  console.log('🚀 ATTACHED TO ACTIVE ADZUNA TAB:');
  console.log(`🔗 URL: ${page.url()}`);
  console.log('======================================================');

  await page.bringToFront();

  // Step 1: Banner Check
  console.log('\n[Log 1/5] Checking for "Leave us your email" banner...');
  const bannerHandled = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const noThanks = btns.find(b => b.innerText && b.innerText.trim().toLowerCase() === 'no, thanks');
    if (noThanks) {
      noThanks.click();
      return true;
    }
    return false;
  });
  console.log(`  -> Banner dismissed: ${bannerHandled}`);
  console.log('⏳ Pacing delay 3 seconds (Watch your screen)...');
  await sleep(3000);

  // Step 2: Interstitial Click
  console.log('\n[Log 2/5] Looking for "No thanks, take me to the job" link...');
  const clickedTakeMe = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const takeMe = links.find(a => a.innerText && a.innerText.toLowerCase().includes('take me to the job'));
    if (takeMe) {
      takeMe.click();
      return true;
    }
    return false;
  });

  if (clickedTakeMe) {
    console.log('  -> Clicked "No thanks, take me to the job"! Redirecting...');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
  } else {
    console.log('  -> Take me link not present, clicking direct apply button...');
    await page.evaluate(() => {
      const applyBtn = document.querySelector('a.apply_btn, a[href*="/land/ad/"]');
      if (applyBtn) applyBtn.click();
    });
    await sleep(3000);
  }

  console.log('⏳ Destination page loaded. Pacing delay 3 seconds...');
  await sleep(3000);

  // Step 3: Destination URL Analysis
  const destUrl = page.url();
  console.log(`\n[Log 3/5] Landed on live employer destination:`);
  console.log(`  -> Live Destination URL: ${destUrl}`);

  // Step 4: Live JD Inspection
  console.log('\n[Log 4/5] Reading Live Destination JD from DOM...');
  const jdData = await page.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const title = document.title;
    const hasApplyBtn = Array.from(document.querySelectorAll('button, a')).some(b => b.innerText && (b.innerText.trim() === 'Apply to this job' || b.innerText.trim() === 'Apply now'));
    const isSenior = /senior|lead|principal|architect/i.test(text);
    const isOverExp = /3\+|4\+|5\+|6\+|3-5|4-6/i.test(text);
    return { title, hasApplyBtn, isSenior, isOverExp, snippet: text.substring(0, 300).replace(/\s+/g, ' ') };
  });

  console.log(`  - Destination Title: "${jdData.title}"`);
  console.log(`  - Apply Button Present: ${jdData.hasApplyBtn}`);
  console.log(`  - Experience Requirements: OverExp=${jdData.isOverExp}, Senior=${jdData.isSenior}`);
  console.log(`  - Live Text Snippet: "${jdData.snippet}..."`);

  console.log('⏳ Pacing delay 3 seconds...');
  await sleep(3000);

  // Step 5: Decision Gate
  console.log('\n[Log 5/5] Rule Gate Decision:');
  if (jdData.isSenior || jdData.isOverExp) {
    console.log('  🚫 RULE 60 REJECTION: Job requires 3+ YOE / Senior level. Tab will remain open on your screen.');
  } else {
    console.log('  ✅ 0-2 YOE MATCH: Job is ready for direct form application!');
  }

  console.log('\n🏁 Script execution finished. Tab open hi rahegi aapke screen par!');
  browser.disconnect();
}

runInteractiveOnOpenTab().catch(console.error);
