import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    const url = 'https://www.foundit.in/seeker/single-page-registration?from=adzuna&spl=IN_paid_job_boards_acq_affiliates_adzuna_Feed&gd=1&jobid=155240411&action=apply&utm_campaign=IN_paid_job_boards_acq_affiliates_adzuna_Feed&utm_medium=affiliates&utm_source=adzuna';
    console.log('Navigating to Foundit Infosys job registration...');
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));

    const pageInfo = await p.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        inputs: Array.from(document.querySelectorAll('input, select, textarea, button')).map(i => ({
          tag: i.tagName,
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          text: i.innerText.trim()
        })).slice(0, 20)
      };
    });

    console.log('Foundit form info:', JSON.stringify(pageInfo, null, 2));
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
