const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function fillQuestGlobal() {
  const profile = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/candidate_screening_profile.json', 'utf8')).profile;
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('careers.quest-global.com/global/en/apply'));
  if (!page) {
    console.error('Quest Global apply page not found');
    process.exit(1);
  }

  console.log('Prefilling Quest Global Phenom ATS form...');

  // 1. Upload Resume
  const resumePath = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - React Developer.pdf';
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    console.log('Uploading resume:', resumePath);
    await fileInput.uploadFile(resumePath);
    await new Promise(r => setTimeout(r, 3000));
  }

  // 2. Personal fields
  await page.evaluate((prof) => {
    function setVal(id, val) {
      const el = document.getElementById(id);
      if (el) {
        el.focus();
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }

    setVal('firstName', 'Pratik');
    setVal('lastName', 'Patidar');
    setVal('email', prof.email);
    setVal('phoneNumber', prof.phone.replace('+91 ', ''));

    // Select country
    const countrySelect = document.getElementById('country');
    if (countrySelect) {
      countrySelect.value = 'India';
      countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Select gender
    const genderSelect = document.getElementById('genderInd');
    if (genderSelect) {
      genderSelect.value = 'Male';
      genderSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Check disclaimer checkbox
    const disc = document.getElementById('DisclaimerText');
    if (disc && !disc.checked) {
      disc.click();
    }
  }, profile);

  console.log('Filled personal details and agreed to disclaimer on Quest Global.');
  process.exit(0);
}

fillQuestGlobal().catch(err => {
  console.error(err);
  process.exit(1);
});
