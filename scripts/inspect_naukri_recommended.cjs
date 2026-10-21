const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();

  // 1. Check Tab 9 (JSR Technologies)
  const jsrPage = pages.find(p => p.url().includes('jsr-technologies'));
  if (jsrPage) {
    console.log('=== Checking Open JSR Technologies Tab ===');
    const jsrDetails = await jsrPage.evaluate(() => {
      const applyBtn = Array.from(document.querySelectorAll('button, a')).find(el => {
        const t = (el.innerText || '').trim().toLowerCase();
        return t === 'apply' || t.includes('apply on company site') || t === 'apply now';
      });
      const alreadyApplied = /already applied|applied on/i.test(document.body ? document.body.innerText : '');
      return {
        title: document.title,
        url: window.location.href,
        hasApply: !!applyBtn,
        applyText: applyBtn ? applyBtn.innerText.trim() : null,
        alreadyApplied
      };
    });
    console.log('JSR Tech state:', JSON.stringify(jsrDetails, null, 2));
  }

  // 2. Check Recommended Jobs from Mynaukri
  const homePage = pages.find(p => p.url().includes('mnjuser'));
  if (homePage) {
    console.log('\n=== Extracting Recommended Jobs from Mynaukri Tab ===');
    const recJobs = await homePage.evaluate(() => {
      // Find all job cards or recommended links
      const cards = Array.from(document.querySelectorAll('article, .jobTuple, .srp-jobtuple-wrapper, [class*="jobTuple"], [class*="recom-job"], a[href*="job-listings"]'));
      const results = [];
      const seenUrls = new Set();

      for (const el of cards) {
        let anchor = el.tagName === 'A' ? el : el.querySelector('a[href*="job-listings"]');
        if (!anchor) continue;
        const href = anchor.href.split('?')[0];
        if (seenUrls.has(href)) continue;
        seenUrls.add(href);

        const cardText = (el.innerText || '').split('\n').map(x => x.trim()).filter(Boolean);
        results.push({
          title: anchor.innerText.trim() || cardText[0],
          url: href,
          snippet: cardText.slice(0, 5).join(' | ')
        });
      }
      return results.slice(0, 15);
    });
    console.log('Found Recommended Jobs:', JSON.stringify(recJobs, null, 2));
  }
})();
