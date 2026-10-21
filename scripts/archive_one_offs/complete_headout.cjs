const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function completeHeadout() {
  const profile = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/candidate_screening_profile.json', 'utf8')).profile;
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('greenhouse.io/headoutcareers'));
  if (!page) {
    console.error('Headout page not found');
    process.exit(1);
  }

  console.log('Completing screening questions on Headout...');

  // Current compensation
  const curr = await page.$('#question_8687533006');
  if (curr) {
    await curr.click({ clickCount: 3 });
    await curr.type(`${profile.current_ctc_lpa} LPA`, { delay: 30 });
  }

  // Notice period
  const notice = await page.$('#question_8647646006');
  if (notice) {
    await notice.click({ clickCount: 3 });
    await notice.type(profile.notice_period_days, { delay: 30 });
  }

  // Helper to select Greenhouse custom dropdowns
  async function selectDropdown(id, optionText) {
    console.log(`Selecting dropdown ${id} with option: ${optionText}`);
    await page.evaluate((targetId, text) => {
      const container = document.getElementById(targetId)?.closest('.field') || document.getElementById(targetId)?.parentElement;
      if (container) {
        const toggle = container.querySelector('.select__control, [class*="control"], button');
        if (toggle) toggle.click();
      }
    }, id, optionText);
    await new Promise(r => setTimeout(r, 600));

    await page.evaluate((text) => {
      const options = Array.from(document.querySelectorAll('[class*="option"], .select__option, li, div[role="option"]'));
      const match = options.find(o => o.innerText.toLowerCase().includes(text.toLowerCase()));
      if (match) match.click();
    }, optionText);
    await new Promise(r => setTimeout(r, 600));
  }

  // 1. React experience
  await selectDropdown('question_8705238006', '1-2');

  // 2. Total full-time experience
  await selectDropdown('question_8647640006', '1-2');

  // 3. Relocate to Bangalore
  await selectDropdown('question_8647641006', 'Yes');

  // 4. Interviewed in past 1 year
  await selectDropdown('question_8647642006', 'No');

  // 5. Confirmation
  await selectDropdown('question_8647647006', 'Yes');

  // 6. Gender
  await selectDropdown('question_8647648006', 'Male');

  console.log('All screening questions selected. Checking reCAPTCHA presence...');

  const hasRecaptcha = await page.evaluate(() => {
    return !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]');
  });

  console.log('Has reCAPTCHA?:', hasRecaptcha);
  process.exit(0);
}

completeHeadout().catch(err => {
  console.error(err);
  process.exit(1);
});
