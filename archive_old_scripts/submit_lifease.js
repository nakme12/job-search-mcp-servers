import puppeteer from 'puppeteer-core';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('placementindia.com'));
    if (!page) {
      console.log('No placementindia page found, list of open tabs:');
      for (let p of pages) console.log(p.url());
      process.exit(1);
    }
    console.log('Found page:', page.url());

    // Select Gender Male
    const genderResult = await page.evaluate(() => {
      const g = document.querySelector('select[name="gender"], select#gender, select[name*="gender"]');
      if (g) {
        // find option with value Male or text Male
        const opt = Array.from(g.options).find(o => o.text.trim().toLowerCase() === 'male' || o.value.trim().toLowerCase() === 'male');
        if (opt) {
          g.value = opt.value;
          g.dispatchEvent(new Event('change', { bubbles: true }));
          return 'Selected ' + opt.text + ' (value: ' + opt.value + ')';
        }
      }
      return 'Gender select not found';
    });
    console.log('Gender:', genderResult);

    // Fill Mobile Number
    const mobileResult = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const m = inputs.find(i => (i.name && i.name.toLowerCase().includes('mobile')) || 
                                (i.id && i.id.toLowerCase().includes('mobile')) || 
                                (i.placeholder && i.placeholder.toLowerCase().includes('mobile')));
      if (m) {
        m.value = '8269647990';
        m.dispatchEvent(new Event('input', { bubbles: true }));
        m.dispatchEvent(new Event('change', { bubbles: true }));
        return 'Set mobile to: ' + m.value;
      }
      return 'Mobile input not found';
    });
    console.log('Mobile:', mobileResult);

    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_ready_to_submit.png' });

    // Click Submit Application button
    const submitResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn'));
      const btn = buttons.find(b => {
        const text = (b.innerText || b.value || '').trim().toLowerCase();
        return text.includes('submit application') || text.includes('apply now') || text.includes('submit');
      });
      if (btn) {
        btn.click();
        return 'Clicked button: ' + (btn.innerText || btn.value);
      }
      return 'Submit button not found';
    });
    console.log('Submit button clicked:', submitResult);

    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_post_submit.png' });
    console.log('Post-submit screenshot taken.');

    const summary = await page.evaluate(() => {
      return document.body.innerText.slice(0, 1000).replace(/\s+/g, ' ');
    });
    console.log('Page state text summary:', summary.slice(0, 300));

  } catch (err) {
    console.error('Execution error:', err.message);
  }
})();
