const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 60000 });
    const pages = await browser.pages();
    let p = pages.find(x => x.url().includes('mail.google.com'));
    if (!p) {
      b.disconnect();
      return;
    }
    await p.bringToFront();

    // Check pagination buttons in DOM
    const navButtons = await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], span[role="button"]'));
      return btns.map(b => ({
        ariaLabel: b.getAttribute('aria-label'),
        dataTooltip: b.getAttribute('data-tooltip'),
        disabled: b.getAttribute('aria-disabled'),
        text: b.innerText.trim()
      })).filter(b => (b.ariaLabel && (b.ariaLabel.includes('Older') || b.ariaLabel.includes('Newer'))) || (b.dataTooltip && (b.dataTooltip.includes('Older') || b.dataTooltip.includes('Newer'))));
    });

    console.log('Pagination buttons found:', JSON.stringify(navButtons, null, 2));

    let allRows = [];
    let pageNum = 1;

    while (pageNum <= 5) {
      console.log(`\n--- Reading Page ${pageNum} ---`);
      await sleep(2500);

      const rows = await p.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tr.zA, tr[role="row"]')).filter(r => r.innerText.trim().length > 5);
        return trs.map((r, i) => {
          const senderEl = r.querySelector('.zF, .bA4, .yX, span[email]');
          const sender = senderEl ? senderEl.innerText.trim() : (r.querySelector('.yX')?.innerText.trim() || '');
          const subjectEl = r.querySelector('.bog, .bqe, span[data-thread-id]');
          const subject = subjectEl ? subjectEl.innerText.trim() : '';
          const snippetEl = r.querySelector('.y2');
          const snippet = snippetEl ? snippetEl.innerText.trim() : '';
          const dateEl = r.querySelector('.xW, .m1');
          const date = dateEl ? (dateEl.getAttribute('title') || dateEl.innerText.trim()) : '';
          const isUnread = r.classList.contains('zE');
          return { sender, subject, snippet, date, isUnread };
        }).filter(x => x.sender || x.subject);
      });

      console.log(`Page ${pageNum} extracted ${rows.length} rows.`);
      rows.forEach(r => allRows.push(r));

      // Click "Older"
      const clicked = await p.evaluate(() => {
        const next = Array.from(document.querySelectorAll('div[role="button"], span[role="button"]'))
          .find(b => (b.getAttribute('aria-label') === 'Older' || b.getAttribute('data-tooltip') === 'Older') && b.getAttribute('aria-disabled') !== 'true');
        if (next) {
          next.click();
          return true;
        }
        return false;
      });

      if (!clicked) {
        console.log('No Older button active. End of results.');
        break;
      }

      pageNum++;
      await sleep(3500);
    }

    console.log(`\nTotal emails collected across pages: ${allRows.length}`);
    fs.writeFileSync('all_15_days_emails.json', JSON.stringify(allRows, null, 2));

    browser.disconnect();
  } catch (e) {
    console.error('Error:', e.message);
    if (browser) browser.disconnect();
  }
})();
