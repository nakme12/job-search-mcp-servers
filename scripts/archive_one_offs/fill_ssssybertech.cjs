const path = require('path');
const puppeteer = require('puppeteer-core');

const RESUME_PATH = path.resolve(__dirname, '..', 'resumes', 'Pratik Patidar Resume - MERN Full Stack.pdf');

const BIO_TEXT = `Full Stack / Frontend Developer with 1.5 years of experience building full-stack web applications using React.js, TypeScript, REST APIs, and modern frontend architectures. Based in Indore, open to onsite in Delhi and immediate joining. Portfolio: https://pratik-portfolio-nine-orcin.vercel.app | LinkedIn: https://www.linkedin.com/in/pratik-patidar`;

async function fillSsssybertechPortal() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages.find(page => page.url().includes('ssssybertech.com'));

  if (!p) {
    console.log('SSSSybertech page not found.');
    return;
  }

  await p.bringToFront();
  console.log('Portal tab brought to front!');

  // Fill Full Name
  console.log('1. Filling Name: Pratik Patidar');
  const nameInput = await p.$('#awsm-applicant-name');
  if (nameInput) await nameInput.type('Pratik Patidar', { delay: 15 });

  // Fill Email
  console.log('2. Filling Email: pratikpatidar7990@gmail.com');
  const emailInput = await p.$('#awsm-applicant-email');
  if (emailInput) await emailInput.type('pratikpatidar7990@gmail.com', { delay: 15 });

  // Fill Phone
  console.log('3. Filling Phone: 8269647990');
  const phoneInput = await p.$('#awsm-applicant-phone');
  if (phoneInput) await phoneInput.type('8269647990', { delay: 15 });

  // Fill Bio / Cover letter
  console.log('4. Filling Bio...');
  const bioInput = await p.$('#awsm-cover-letter');
  if (bioInput) await bioInput.type(BIO_TEXT, { delay: 10 });

  // Upload Resume
  console.log('5. Uploading Resume:', RESUME_PATH);
  const fileInput = await p.$('#awsm-application-file');
  if (fileInput) await fileInput.uploadFile(RESUME_PATH);

  // Check Privacy Policy
  console.log('6. Checking Privacy Policy agreement...');
  await p.evaluate(() => {
    const cb = document.getElementById('awsm_form_privacy_policy');
    if (cb && !cb.checked) cb.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  // Verify filled values in DOM
  const verifiedState = await p.evaluate(() => {
    return {
      name: document.getElementById('awsm-applicant-name')?.value,
      email: document.getElementById('awsm-applicant-email')?.value,
      phone: document.getElementById('awsm-applicant-phone')?.value,
      bio: document.getElementById('awsm-cover-letter')?.value.substring(0, 80) + '...',
      file: document.getElementById('awsm-application-file')?.value,
      privacyChecked: document.getElementById('awsm_form_privacy_policy')?.checked
    };
  });

  console.log('\n================ LIVE FORM POPULATED & READY ================');
  console.log(JSON.stringify(verifiedState, null, 2));
  console.log('=============================================================\n');
}

fillSsssybertechPortal().catch(console.error);
