import puppeteer from 'puppeteer-core';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('placementindia.com'));
    if (!page) {
      console.log('No placementindia page found');
      return;
    }

    // Direct type using keyboard into the email input
    const emailField = await page.$('input[placeholder*="Email ID"], input[placeholder*="Email"]');
    if (emailField) {
      await emailField.click({ clickCount: 3 });
      await emailField.press('Backspace');
      await emailField.type('patidarpratik0099@gmail.com', { delay: 50 });
      console.log('Typed email directly with keyboard');
    } else {
      console.log('Could not find email element via puppeteer selector');
    }

    // Dismiss the locality autocomplete overlay by pressing Escape
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    // Also click on the title or safe modal background to close popup
    await page.evaluate(() => {
      const heading = document.querySelector('h2, h3, h4, .modal-title, [class*="title"]');
      if (heading) heading.click();
    });

    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_email_typed_clean.png' });

    // Now click Submit Application
    const submitBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn'));
      const btn = btns.find(b => (b.innerText || b.value || '').trim().toLowerCase().includes('submit application'));
      if (btn) {
        btn.click();
        return 'Clicked Submit Application successfully';
      }
      return 'Submit button not found';
    });
    console.log(submitBtn);

    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_post_submit_verified.png' });
    console.log('Verified submission screenshot saved.');

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
