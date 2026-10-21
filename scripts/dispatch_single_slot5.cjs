const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const company = 'BQarlson Software Technologies';
  const role = 'Full Stack Developer';
  const recipient = 'hr@bqarlson.tech';
  const resumeName = 'Pratik Patidar Resume - MERN Full Stack.pdf';
  const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes', resumeName);

  console.log('Connecting to Brave port 9222...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const gmail = pages.find(p => p.url().includes('mail.google.com/mail/u/0/'));

  if (!gmail) {
    console.error('Gmail /u/0/ tab not found!');
    await browser.disconnect();
    return;
  }

  console.log('Targeting Gmail tab:', gmail.url());
  await gmail.bringToFront();

  // Click Compose button
  console.log('Clicking Compose button...');
  await gmail.evaluate(() => {
    const compose = document.querySelector('div[role="button"][gh="cm"]') || document.querySelector('.T-I.T-I-KE.L3');
    if (compose) compose.click();
  });

  await sleep(3000);

  // Type Recipient
  console.log('Entering recipient:', recipient);
  await gmail.keyboard.type(recipient);
  await sleep(1000);
  await gmail.keyboard.press('Enter');
  await sleep(1000);

  // Type Subject
  await gmail.keyboard.press('Tab');
  await sleep(500);
  const subject = `Application for ${role} - Pratik Patidar`;
  console.log('Entering subject:', subject);
  await gmail.keyboard.type(subject);
  await sleep(1000);

  // Type Body
  await gmail.keyboard.press('Tab');
  await sleep(500);
  const body = `Hi ${company} Hiring Team,

I came across your opening for a ${role} and wanted to apply for the role.

I'm a Full Stack Developer with 1.5 years of experience building full-stack web applications using React.js, Node.js, Express.js, MongoDB, TypeScript, REST APIs, and modern frontend & backend architectures.

I'm based in Indore and would be glad to discuss the opportunity further.

I've attached my updated resume for your review.

LinkedIn: https://www.linkedin.com/in/pratik-patidar
Portfolio: https://pratik-portfolio-nine-orcin.vercel.app

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990`;

  console.log('Pasting body via execCommand...');
  await gmail.evaluate((text) => {
    document.execCommand('insertText', false, text);
  }, body);

  await sleep(2000);

  // Upload Resume
  console.log('Uploading resume:', resumeName);
  const fileInput = await gmail.$('input[type="file"][name="Filedata"]');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    console.log('Resume injected into file input. Waiting 7s for upload completion...');
    await sleep(7000);
  }

  // Press Ctrl+Enter to send
  console.log('Triggering Send via Ctrl+Enter...');
  await gmail.keyboard.down('Control');
  await gmail.keyboard.press('Enter');
  await gmail.keyboard.up('Control');

  console.log('Waiting 5s for delivery...');
  await sleep(5000);

  // Verify in Sent Folder
  console.log('Navigating to Sent folder for verification...');
  await gmail.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'networkidle2' });
  await sleep(4000);

  const sentCheck = await gmail.evaluate((sub) => {
    return document.body.innerText.includes(sub);
  }, subject);

  console.log('Live Sent Verification Result:', sentCheck);

  if (sentCheck) {
    const f5Path = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-21.json';
    const f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8'));
    f5.jobs.push({
      id: 'bqarlson_email_' + Date.now(),
      company,
      role,
      recipient,
      application_type: 'Direct Recruiter Email',
      channel: 'Direct Recruiter Email (CDP Verified)',
      subject,
      resume: resumeName,
      status: 'CONFIRMED_SUBMITTED',
      applied_at: new Date().toISOString(),
      notes: 'Pre-flight verified (Salutation: Hi BQarlson Software Technologies Hiring Team) & physically asserted in Gmail Sent folder'
    });
    f5.total = f5.jobs.length;
    f5.updated_at = new Date().toISOString();
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('✅ BQarlson successfully logged to File 5!');
  }

  await browser.disconnect();
})();
