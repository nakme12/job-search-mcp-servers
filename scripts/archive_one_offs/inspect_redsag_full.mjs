import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    await p.goto('https://in.linkedin.com/jobs/view/junior-frontend-developer-at-redsag-4477269828?utm_campaign=google_jobs_apply&utm_source=google_jobs_apply&utm_medium=organic', { waitUntil: 'networkidle2', timeout: 30000 });
    const info = await p.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        text: document.body.innerText.slice(0, 500)
      };
    });
    console.log('Redsag after networkidle2:', info);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
