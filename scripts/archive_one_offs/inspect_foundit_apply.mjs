import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const founditJob = pages.find(p => p.url().includes('react-js-developer-infosys-limited'));
  if (founditJob) {
    await founditJob.bringToFront();
    const btn = await founditJob.evaluate(() => {
      const applyBtns = Array.from(document.querySelectorAll('button, a')).filter(el => (el.innerText || '').toLowerCase().includes('apply'));
      return applyBtns.map(b => ({ tag: b.tagName, text: b.innerText.trim(), class: b.className }));
    });
    console.log('Foundit Infosys apply buttons:', btn);
  }
  await browser.disconnect();
})();
