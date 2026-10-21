const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function fillPenthara() {
  const profile = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/candidate_screening_profile.json', 'utf8')).profile;
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('zohorecruit.com'));
  if (!page) {
    console.log('Penthara page not found');
    process.exit(1);
  }

  console.log('Filling Penthara Zoho Recruit application form...');

  await page.evaluate((prof) => {
    function setValByLabel(labelText, val) {
      const labels = Array.from(document.querySelectorAll('label, .cw-field-label'));
      const target = labels.find(l => l.innerText.toLowerCase().includes(labelText.toLowerCase()));
      if (target) {
        const row = target.closest('tr, .cw-field-row, div.form-group') || target.parentElement;
        const input = row?.querySelector('input, textarea');
        if (input) {
          input.focus();
          input.value = val;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      }
    }

    function selectRadioByLabel(questionText, optionText) {
      const labels = Array.from(document.querySelectorAll('label, .cw-field-label'));
      const target = labels.find(l => l.innerText.toLowerCase().includes(questionText.toLowerCase()));
      if (target) {
        const row = target.closest('tr, .cw-field-row, div.form-group') || target.parentElement;
        const radios = Array.from(row.querySelectorAll('label, span, input[type="radio"]'));
        const opt = radios.find(r => r.innerText?.trim().toLowerCase() === optionText.toLowerCase());
        if (opt) {
          opt.click();
          const radioInput = opt.querySelector('input') || opt;
          if (radioInput) radioInput.checked = true;
        }
      }
    }

    // 1. Personal Info
    setValByLabel('First Name', 'Pratik');
    setValByLabel('Last Name', 'Patidar');
    setValByLabel('Email', prof.email);
    setValByLabel('Mobile', prof.phone.replace('+91 ', ''));
    setValByLabel('City', 'Indore');
    setValByLabel('State/Province', 'Madhya Pradesh');
    setValByLabel('Country', 'India');
    setValByLabel('Current Job Title', 'Frontend Developer');
    setValByLabel('Skill Set', 'React.js, Next.js, TypeScript, JavaScript, HTML5, CSS3, REST APIs, Git');
    setValByLabel('LinkedIn', prof.linkedin);

    // Consent Checkbox
    const consent = document.querySelector('input[type="checkbox"][id*="rec-form"]');
    if (consent && !consent.checked) consent.click();

    // 2. Custom Questions Verified by Candidate
    selectRadioByLabel('relocate to Mohali', 'Yes');
    selectRadioByLabel('5 PM to 2 AM Shift', 'Yes');

    setValByLabel('Class 10th and 12th', 'Class 10th: 90%, Class 12th: 79.6%');
    setValByLabel('dreaming of doing or becoming', 'Building high-performance scalable web applications and growing into a core frontend engineering specialist.');
    setValByLabel('Why are you interested in this position', 'I am passionate about modern React ecosystem and cloud-integrated web apps. Penthara’s culture of innovation and impactful client solutions aligns perfectly with my background.');
    setValByLabel('years of experience do you have in ReactJS', '2 Years');
    setValByLabel('notice period', '15 Days');
    setValByLabel('interests you most about our company', 'The focus on cutting-edge Azure/M365 cloud ecosystems, engineering excellence, and transparent culture.');
    setValByLabel('expectations regarding salary', '4.65 LPA (Negotiable as per company standards)');
    setValByLabel('core value that you cannot compromise on', 'Honesty, engineering integrity, and consistent accountability.');
    setValByLabel('derive your inspiration from', 'Solving real-world user problems through clean, fast code and learning from world-class tech builders.');
  }, profile);

  // 3. Upload Resume
  const resumePath = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - React Developer.pdf';
  const fileInputs = await page.$$('input[type="file"]');
  for (const fi of fileInputs) {
    const name = await page.evaluate(el => el.name || el.id, fi);
    if (name.includes('resume') || name.includes('file')) {
      console.log('Uploading resume to:', name);
      await fi.uploadFile(resumePath);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('Penthara Zoho Recruit form fully prefilled.');
  process.exit(0);
}

fillPenthara().catch(err => {
  console.error(err);
  process.exit(1);
});
