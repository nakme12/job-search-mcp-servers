import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    await p.goto('https://in.linkedin.com/jobs/view/junior-frontend-developer-at-redsag-4477269828?utm_campaign=google_jobs_apply&utm_source=google_jobs_apply&utm_medium=organic', { waitUntil: 'networkidle2', timeout: 30000 });
    const links = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => l.href.includes('redsag') || l.text.toLowerCase().includes('apply'));
    });
    console.log('Redsag external links:', links);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
