const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('mail.google.com'));
    if (!page) {
      page = await browser.newPage();
      await page.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded', timeout: 20000 });
    } else {
      await page.bringToFront();
      await page.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded', timeout: 20000 });
    }
    await new Promise(r => setTimeout(r, 3000));
    
    // Find row with 'Shweta' or 'Application for Full Stack Developer'
    const clicked = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
      for (const r of rows) {
        if (r.innerText.includes('Shweta') || r.innerText.includes('Application for Full Stack Developer')) {
          r.click();
          return true;
        }
      }
      return false;
    });
    
    if (clicked) {
      await new Promise(r => setTimeout(r, 4000));
      const details = await page.evaluate(() => {
        // Expand all messages if collapsed
        const expandBtn = document.querySelector('img[aria-label="Expand all"], div[aria-label="Expand all"]');
        if (expandBtn) expandBtn.click();

        const subject = document.querySelector('h2.hP')?.innerText || '';
        const msgs = Array.from(document.querySelectorAll('.adn, .gs'));
        return {
          subject,
          messages: msgs.map(m => {
            const sender = m.querySelector('.gD')?.innerText || m.querySelector('span[email]')?.innerText || '';
            const email = m.querySelector('span[email]')?.getAttribute('email') || '';
            const body = m.querySelector('.a3s.aiL')?.innerText || m.innerText || '';
            const date = m.querySelector('.g3')?.innerText || '';
            return { sender, email, date, body };
          })
        };
      });

      console.log('=== THREAD SUBJECT ===', details.subject);
      details.messages.forEach((m, idx) => {
        console.log(`\n--- MESSAGE #${idx + 1} ---`);
        console.log(`From: ${m.sender} <${m.email}> | Date: ${m.date}`);
        console.log(`Body:\n${m.body}\n`);
      });

      fs.writeFileSync('C:\\mcp\\shweta_thread_dump.json', JSON.stringify(details, null, 2), 'utf8');
    } else {
      console.log('Row not found for Shweta!');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (browser) await browser.disconnect();
  }
})();
