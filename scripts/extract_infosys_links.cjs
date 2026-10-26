const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 60000 });
  const pages = await b.pages();
  const p = pages.find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.bringToFront();

  // Search by form submit
  await p.evaluate(() => {
    const input = document.querySelector('input[aria-label="Search mail"], input[name="q"]');
    if (input) {
      input.value = 'from:infycareers@infosys.com';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const form = input.closest('form');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
    }
  });

  await new Promise(r => setTimeout(r, 3500));

  // Click row safely
  await p.evaluate(() => {
    const row = document.querySelector('tr.zA');
    if (row) {
      const link = row.querySelector('.bog') || row;
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
  });

  await new Promise(r => setTimeout(r, 3000));

  const emailDetails = await p.evaluate(() => {
    const subject = document.querySelector('h2.hP')?.innerText || '';
    const sender = document.querySelector('.gD')?.innerText || '';
    const senderEmail = document.querySelector('.gD')?.getAttribute('email') || '';
    const date = document.querySelector('.g3')?.getAttribute('title') || document.querySelector('.g3')?.innerText || '';
    const body = document.querySelector('.a3s')?.innerText || '';
    const links = Array.from(document.querySelectorAll('.a3s a')).map(a => ({
      text: a.innerText.trim(),
      href: a.href
    }));
    return { subject, sender, senderEmail, date, body, links };
  });

  console.log('=== FULL INFOSYS EMAIL DETAILS WITH LINKS ===');
  console.log(JSON.stringify(emailDetails, null, 2));

  b.disconnect();
})();
