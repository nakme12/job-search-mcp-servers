const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  const url = 'https://jobicy.com/jobs/155231-full-stack-web-engineer';
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 2500));

  const dest = await p.evaluate(() => {
    const btn = document.querySelector('a.job_application_button, [href*="#job-application"], .job-application-button, .application-button');
    const section = document.querySelector('#job-application, .job-application');
    return {
      btnText: btn ? btn.innerText : null,
      btnHref: btn ? btn.href : null,
      sectionText: section ? section.innerText.slice(0, 300) : null
    };
  });
  console.log('Jobicy application target:', JSON.stringify(dest, null, 2));

  // If there's a button click it to see what expands
  await p.evaluate(() => {
    const b = document.querySelector('a.job_application_button, [href*="#job-application"]');
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const afterClick = await p.evaluate(() => {
    const s = document.querySelector('.application_details, #job-application');
    return s ? s.innerText.slice(0, 500) : 'None';
  });
  console.log('After click details:', afterClick);

  await p.close();
  browser.disconnect();
})();
