import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    console.log('Opening Acme Services on Adzuna...');
    await p.goto('https://www.adzuna.in/details/5917523560?utm_medium=api&utm_source=22d4b243', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const applyLinks = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => l.text.toLowerCase().includes('apply'));
    });
    console.log('Acme apply links:', applyLinks);

    if (applyLinks.length > 0) {
      console.log('Navigating to apply link:', applyLinks[0].href);
      await p.goto(applyLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 4000));
      const pageInfo = await p.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          formsCount: document.querySelectorAll('form').length,
          inputs: Array.from(document.querySelectorAll('input, select, textarea, button')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            text: i.innerText.trim()
          })).slice(0, 15)
        };
      });
      console.log('Landing page info:', JSON.stringify(pageInfo, null, 2));
    }
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
