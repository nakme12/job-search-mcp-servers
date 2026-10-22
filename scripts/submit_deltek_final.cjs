const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const deltek = (await browser.pages()).find(p => p.url().includes('sjobs.brassring.com'));
    if (!deltek) {
      console.log('Deltek tab not found!');
      process.exit(0);
    }

    console.log('[Deltek Final Submission] On screen:', await deltek.title());

    // 1. Check checkbox-15481-Accept
    await deltek.evaluate(() => {
      const cb = document.getElementById('checkbox-15481-Accept');
      if (cb && !cb.checked) {
        cb.click();
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await new Promise(r => setTimeout(r, 1000));

    // 2. Click Continue / Submit button
    console.log('[Deltek Final Submission] Clicking Continue/Submit...');
    await deltek.evaluate(() => {
      const next = document.getElementById('shownext');
      if (next) next.click();
    });

    await new Promise(r => setTimeout(r, 5000));

    // 3. Check if there is a review screen or final confirmation
    let title = await deltek.title();
    console.log('[Deltek] Title after click:', title);

    // If review screen, check if there's a final "Send my application" or "Submit" button
    const reviewBtn = await deltek.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
      for (const b of buttons) {
        const t = b.innerText.trim().toLowerCase();
        if (t === 'send my application' || t === 'submit application' || t === 'submit' || t === 'confirm') {
          b.click();
          return t;
        }
      }
      return null;
    });

    if (reviewBtn) {
      console.log(`[Deltek] Clicked final submit button: "${reviewBtn}"`);
      await new Promise(r => setTimeout(r, 6000));
      title = await deltek.title();
      console.log('[Deltek] Title after final submit:', title);
    }

    // 4. Check confirmation and capture screenshot
    const screenshotDir = path.join('C:', 'mcp', 'job-search-mcp-engine', 'screenshots', '2026-10-19', 'shift1');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, 'deltek_brassring_applied.png');

    await deltek.screenshot({ path: screenshotPath, fullPage: false });
    console.log('[Deltek] Captured screenshot:', screenshotPath);

    const bodyText = await deltek.evaluate(() => document.body.innerText);
    const isSuccess = bodyText.includes('Thank you') || 
                      bodyText.includes('Application submitted') || 
                      bodyText.includes('successfully submitted') ||
                      bodyText.includes('Your application has been received') ||
                      bodyText.includes('completed') ||
                      title.toLowerCase().includes('thank') ||
                      title.toLowerCase().includes('complete') ||
                      title.toLowerCase().includes('submitted');

    console.log('[Deltek Submission Verified?]:', isSuccess);

    if (isSuccess) {
      const appliedPath = path.join('C:', 'mcp', 'job-search-mcp-engine', 'applied_todays_2026-10-19.json');
      const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
      appliedData.total += 1;
      appliedData.jobs.push({
        id: appliedData.total,
        company: 'Deltek',
        role: 'Software Engineer',
        recipient: 'Deltek Talent Acquisition (Brassring)',
        channel: 'Direct ATS Portal (Brassring)',
        url: deltek.url(),
        applied_at: new Date().toISOString(),
        screenshot: 'screenshots/2026-10-19/shift1/deltek_brassring_applied.png',
        status: 'CONFIRMED_APPLIED'
      });
      fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2), 'utf8');
      console.log(`>>> SUCCESS: Deltek logged to applied_todays_2026-10-19.json! Total now: ${appliedData.total} <<<`);

      // Close tab per Rule 57
      await deltek.close();
      console.log('[Deltek] Tab closed per Rule 57.');
    } else {
      console.log('[Deltek] Check screenshot to see what screen it is currently on.');
    }

  } catch (err) {
    console.error('Deltek submit error:', err.message);
  } finally {
    if (browser) await browser.disconnect();
    process.exit(0);
  }
})();
