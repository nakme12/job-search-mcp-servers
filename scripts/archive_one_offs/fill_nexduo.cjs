const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function fillNexDuo() {
  const profile = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/candidate_screening_profile.json', 'utf8')).profile;
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('nexduo.in'));
  if (!page) {
    console.error('NexDuo page not found');
    process.exit(1);
  }

  console.log('Filling NexDuo Frontend Engineer application modal...');

  // 1. Text Inputs
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

    setVal('app-name', prof.name);
    setVal('app-email', prof.email);
    setVal('app-phone', prof.phone.replace('+91 ', ''));
    setVal('app-linkedin', prof.linkedin);

    // Select Experience: 1–2 years
    const expSelect = document.getElementById('app-exp');
    if (expSelect) {
      expSelect.value = '1–2 years';
      expSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Cover note
    const note = document.getElementById('app-note');
    if (note) {
      note.value = "Hi NexDuo Hiring Team, I'm a Frontend Engineer with 1.5 years of experience building responsive, performant web applications using React.js, Next.js, TypeScript, and modern UI architectures. I would love to contribute to NexDuo's engineering team.";
      note.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, profile);

  // 2. Upload Resume
  const resumePath = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf';
  const fileInput = await page.$('#app-resume');
  if (fileInput) {
    console.log('Uploading authorized resume:', resumePath);
    await fileInput.uploadFile(resumePath);
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('Prefill complete. Checking for Turnstile / Captcha on modal...');
  const hasCaptcha = await page.evaluate(() => {
    return !!document.querySelector('iframe[src*="turnstile"], iframe[src*="recaptcha"], .cf-turnstile');
  });

  console.log('Has Captcha?:', hasCaptcha);
  process.exit(0);
}

fillNexDuo().catch(err => {
  console.error(err);
  process.exit(1);
});
