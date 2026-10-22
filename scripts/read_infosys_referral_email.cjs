const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const gmail = pages.find(p => p.url().includes('mail.google.com') && (p.url().includes('FMfcgzQhWxRtQsbWZkrjg') || (p.title() && p.title().includes('Infosys'))));

  if (!gmail) {
    console.log('Target Gmail tab not found in open pages.');
    return;
  }

  console.log('Target tab found:', await gmail.title());

  const data = await gmail.evaluate(() => {
    const mainEl = document.querySelector('div[role="main"]');
    if (!mainEl) return { error: 'No main element' };

    const subject = document.querySelector('h2')?.innerText || '';
    const bodyEl = document.querySelector('.a3s.aiL') || mainEl;
    const body = bodyEl ? bodyEl.innerText : '';

    const rawLinks = Array.from(mainEl.querySelectorAll('a')).map(a => ({
      text: a.innerText.trim(),
      href: a.href
    })).filter(l => l.href && (l.href.includes('infosys') || l.text.toLowerCase().includes('click') || l.text.toLowerCase().includes('confirm') || l.text.toLowerCase().includes('here')));

    return { subject, body, links: rawLinks };
  });

  console.log('==============================================================');
  console.log('SUBJECT:', data.subject);
  console.log('\nFULL BODY:\n', data.body);
  console.log('\nACTIONABLE LINKS:\n', JSON.stringify(data.links, null, 2));

  await browser.disconnect();
})();
