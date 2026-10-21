import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    await p.goto('https://hbspl.in/jobs/mern-stack-developer-hbspl-wfh-entry-level-jobs/?utm_campaign=google_jobs_apply&utm_source=google_jobs_apply&utm_medium=organic', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const forms = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((f, idx) => ({
        index: idx,
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, select, textarea, button')).map(i => ({
          tag: i.tagName,
          type: i.type,
          name: i.name,
          placeholder: i.placeholder,
          text: i.innerText
        }))
      }));
    });
    console.log('HBSPL forms:', JSON.stringify(forms, null, 2));
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
