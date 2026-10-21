const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function fillHeadout() {
  const profile = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/candidate_screening_profile.json', 'utf8')).profile;
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('greenhouse.io/headoutcareers'));
  if (!page) {
    console.error('Headout page not found in Chrome tabs');
    process.exit(1);
  }

  console.log('Filling Headout application form with official profile data...');

  // 1. First & Last Name
  await page.type('#first_name', 'Pratik', { delay: 50 });
  await page.type('#last_name', 'Patidar', { delay: 50 });

  // 2. Email
  await page.type('#email', profile.email, { delay: 50 });

  // 3. Phone
  await page.type('#phone', '8269647990', { delay: 50 });

  // 4. Attach Resume
  const resumePath = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - React Developer.pdf';
  const fileInput = await page.$('#resume');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    console.log('Uploaded Resume:', resumePath);
  }

  // 5. LinkedIn & GitHub
  await page.type('#question_8647638006', profile.linkedin, { delay: 30 });
  await page.type('#question_8647639006', profile.github, { delay: 30 });

  // 6. Expected compensation
  await page.type('#question_8687534006', `${profile.expected_ctc_lpa} LPA`, { delay: 30 });

  console.log('Primary fields prefilled. Inspecting remaining select dropdowns...');

  const customFields = await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('label'));
    return divs.map(l => ({
      text: l.innerText.trim(),
      for: l.getAttribute('for'),
      nextInput: l.parentElement?.querySelector('input, select, textarea')?.id
    }));
  });

  console.log('Custom Fields:', JSON.stringify(customFields, null, 2));
  process.exit(0);
}

fillHeadout().catch(err => {
  console.error(err);
  process.exit(1);
});
