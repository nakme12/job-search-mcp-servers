const puppeteer = require('puppeteer-core');
const fs = require('fs');

const targets = [
  'https://www.naukri.com/job-listings-react-web-developer-stellar-technologies-remote-0-to-3-years-121026500086',
  'https://www.naukri.com/job-listings-java-full-stack-developer-react-ignitefortune-tech-pune-0-to-1-years-131026000406',
  'https://www.naukri.com/job-listings-mern-stack-developer-jobaaj-com-pune-0-to-2-years-121026000824',
  'https://www.naukri.com/job-listings-react-js-frontend-developer-innovantes-it-chandigarh-0-to-2-years-131026018710',
  'https://www.naukri.com/job-listings-frontend-developer-ue-developer-remote-0-to-3-years-131026500731',
  'https://www.naukri.com/job-listings-frontend-developer-ue-developer-new-delhi-0-to-3-years-131026500599',
  'https://www.naukri.com/job-listings-junior-developer-creative-hands-hr-hyderabad-chennai-bengaluru-0-to-2-years-121026002003',
  'https://www.naukri.com/job-listings-vs01670-web-development-engineer-e4-softwares-mumbai-0-to-3-years-131026502293',
  'https://www.naukri.com/job-listings-junior-full-stack-developer-perfectlyokay-mumbai-0-to-3-years-121026502547',
  'https://www.naukri.com/job-listings-junior-full-stack-developer-perfectlyokay-ulhasnagar-0-to-3-years-131026501829',
  'https://www.naukri.com/job-listings-software-engineer-cisco-bengaluru-0-to-2-years-121026502633'
];

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(x => x.url().includes('naukri.com')) || pages[0];

  const results = [];
  for (let i = 0; i < targets.length; i++) {
    const url = targets[i];
    console.log('Inspecting ' + (i + 1) + '/' + targets.length + ': ' + url);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));
      const res = await page.evaluate(() => {
        const titleEl = document.querySelector('h1');
        const title = titleEl ? titleEl.innerText.trim() : document.title;
        const comp = document.querySelector('a.styles_jd-header-comp-name__a__, .comp-name, .styles_jd-header-comp-name__')?.innerText?.trim() || '';
        const exp = document.querySelector('.styles_jhc__exp__ span, .styles_jhc__exp__')?.innerText?.trim() || '';
        const loc = document.querySelector('.styles_jhc__loc___ span, .styles_jhc__loc___ a, .styles_jhc__loc___')?.innerText?.trim() || '';
        const sal = document.querySelector('.styles_jhc__salary__ span, .styles_jhc__salary__')?.innerText?.trim() || '';
        const applyBtn = document.querySelector('#apply-button, button.apply-button, .styles_apply-button__');
        const applyBtnText = applyBtn ? applyBtn.innerText.trim() : '';
        const jd = document.querySelector('.styles_JDC__dang-inner-html__, .job-desc-section, section.job-desc')?.innerText?.slice(0, 1500) || '';
        const stat = document.querySelector('.styles_jhc__stat__ span')?.innerText?.trim() || '';

        return { title, comp, exp, loc, sal, applyBtnText, stat, jd };
      });
      results.push(Object.assign({ url: url }, res));
    } catch (e) {
      console.error('Error on', url, e.message);
    }
  }

  fs.writeFileSync('C:/mcp/job-search-mcp-engine/target_jobs_inspected.json', JSON.stringify(results, null, 2));
  console.log('Finished inspecting ' + results.length);
  browser.disconnect();
  process.exit(0);
})();
