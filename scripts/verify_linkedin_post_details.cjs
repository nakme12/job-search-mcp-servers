const puppeteer = require('puppeteer-core');

const posts = [
  { company: 'Engineer Master Solutions', url: 'https://www.linkedin.com/feed/update/urn:li:activity:7516485458353233921/', email: 'hr@engineermaster.in' },
  { company: 'Xonier Technologies', url: 'https://www.linkedin.com/feed/update/urn:li:activity:7515392766776868864/', email: 'hr@xoniertech.com' },
  { company: 'Netu Techno', url: 'https://www.linkedin.com/feed/update/urn:li:activity:7516003396194136064/', email: 'netutechno@gmail.com' },
  { company: 'Vandana Dhiman Lead', url: 'https://www.linkedin.com/feed/update/urn:li:activity:7517456633686454272/', email: 'vandywork93@gmail.com' },
  { company: 'Wits Innovation Lab', url: 'https://www.linkedin.com/feed/update/urn:li:activity:7514565409006686208/', email: 'hardik.thapa@thewitslab.com' },
  { company: 'FxBytes Technologies', url: 'https://www.linkedin.com/feed/update/urn:li:activity:7516002345135144960/', email: 'bharti.shweta@fxbytes.com' }
];

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const liPage = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
    if (!liPage) {
      console.log('LinkedIn tab not found');
      process.exit(0);
    }

    for (const p of posts) {
      console.log(`\nChecking post for ${p.company}...`);
      await liPage.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      
      const details = await liPage.evaluate(() => {
        const text = document.querySelector('.feed-shared-update-v2__description, .feed-shared-text, .update-components-text')?.innerText || document.body.innerText;
        return text.substring(0, 1000).replace(/\n+/g, ' ');
      });

      console.log(`[${p.company} Full Text]:`, details);
    }

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    if (browser) await browser.disconnect();
    process.exit(0);
  }
})();
