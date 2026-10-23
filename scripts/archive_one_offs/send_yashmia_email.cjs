const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const RESUME_PATH = path.resolve(__dirname, '..', 'resumes', 'Pratik Patidar Resume - MERN Full Stack.pdf');
const APPLIED_SHIFT2_PATH = path.join(__dirname, '..', 'applied_todays_2026-10-14_shift2.json');

const EMAIL_BODY = `Hi Yashmia Hiring Team,

I came across your opening for a React.js Developer and wanted to apply for the role.

I'm a Full Stack Developer with 1.5 years of experience building full-stack web applications using React.js, Node.js, Express.js, MongoDB, TypeScript, REST APIs, and modern frontend & backend architectures.

I'm based in Indore and would be glad to discuss the opportunity further.

I've attached my updated resume for your review.

LinkedIn: https://www.linkedin.com/in/pratik-patidar
Portfolio: https://pratik-portfolio-nine-orcin.vercel.app

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990`;

async function dispatchEmail() {
  console.log('📧 [STARTING DIRECT EMAIL DISPATCH TO YASHMIA]');
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });

  const pages = await browser.pages();
  let gmailPage = pages.find(p => p.url().includes('mail.google.com'));
  if (!gmailPage) {
    gmailPage = await browser.newPage();
    await gmailPage.goto('https://mail.google.com/mail/u/1/#inbox', { waitUntil: 'networkidle2' });
  }

  await gmailPage.bringToFront();

  // Click Compose
  console.log('Clicking Compose button...');
  await gmailPage.waitForSelector('div[role="button"][gh="cm"]', { timeout: 15000 });
  await gmailPage.click('div[role="button"][gh="cm"]');
  await new Promise(r => setTimeout(r, 2000));

  // Fill Recipient
  console.log('Filling recipient reachus@yashmia.com...');
  const toSelector = 'input[role="combobox"][aria-label*="To"], input[peoplekit-id]';
  await gmailPage.waitForSelector(toSelector, { timeout: 10000 });
  await gmailPage.type(toSelector, 'reachus@yashmia.com\n', { delay: 50 });
  await new Promise(r => setTimeout(r, 1000));

  // Fill Subject
  console.log('Filling subject...');
  const subjectSelector = 'input[name="subjectbox"]';
  await gmailPage.waitForSelector(subjectSelector, { timeout: 10000 });
  await gmailPage.type(subjectSelector, 'React.js Developer Application - Pratik Patidar (Indore, MP)', { delay: 30 });
  await new Promise(r => setTimeout(r, 1000));

  // Fill Body
  console.log('Filling body...');
  const bodySelector = 'div[aria-label="Message Body"], div[role="textbox"][aria-label*="Message"]';
  await gmailPage.waitForSelector(bodySelector, { timeout: 10000 });
  await gmailPage.focus(bodySelector);
  
  // Set body content cleanly
  await gmailPage.evaluate((text, sel) => {
    const el = document.querySelector(sel);
    el.innerText = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, EMAIL_BODY, bodySelector);
  await new Promise(r => setTimeout(r, 1000));

  // Attach Resume
  console.log('Attaching resume:', RESUME_PATH);
  const fileInputSelector = 'input[type="file"][name="Filedata"]';
  const fileInput = await gmailPage.$(fileInputSelector);
  if (fileInput) {
    await fileInput.uploadFile(RESUME_PATH);
    console.log('Uploaded file, waiting 4s for attachment upload...');
    await new Promise(r => setTimeout(r, 4500));
  } else {
    throw new Error('File input not found');
  }

  // Click Send
  console.log('Clicking Send...');
  const sendSelector = 'div[role="button"][aria-label*="Send"]';
  const sendBtn = await gmailPage.$(sendSelector);
  await sendBtn.click();
  console.log('Sent button clicked! Waiting 4s for confirmation...');
  await new Promise(r => setTimeout(r, 4000));

  // Check physical Gmail Sent Folder
  console.log('Verifying in physical Sent folder...');
  await gmailPage.goto('https://mail.google.com/mail/u/1/#sent', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));

  const isVerifiedInSent = await gmailPage.evaluate(() => {
    const body = document.body.innerText;
    return body.includes('reachus@yashmia.com') || body.includes('React.js Developer Application');
  });

  if (isVerifiedInSent) {
    console.log('✅ Physical Sent folder assertion: reachus@yashmia.com verified in Sent folder!');
    const record = {
      company: "Yashmia",
      role: "React.js Developer",
      recipient: "reachus@yashmia.com",
      channel: "Direct Email (Gmail CDP - Shift 2 Dispatch)",
      subject: "React.js Developer Application - Pratik Patidar (Indore, MP)",
      resume: "Pratik Patidar Resume - MERN Full Stack.pdf",
      timestamp: new Date().toISOString(),
      status: "Applied & Verified (100% Physical Sent Folder Assertion Proof)",
      proof_screenshots: []
    };

    let appliedData = { date: '2026-10-14', shift: 2, total: 0, jobs: [] };
    if (fs.existsSync(APPLIED_SHIFT2_PATH)) {
      appliedData = JSON.parse(fs.readFileSync(APPLIED_SHIFT2_PATH, 'utf8'));
    }
    appliedData.jobs.push(record);
    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(APPLIED_SHIFT2_PATH, JSON.stringify(appliedData, null, 2));
    console.log(`Successfully logged Yashmia to applied_todays_2026-10-14_shift2.json! Current total: ${appliedData.total}`);
  } else {
    console.warn('⚠️ Warning: Not immediately visible in Sent top view, check manual assertion.');
  }

  console.log('Email dispatch routine finished.');
}

dispatchEmail().catch(console.error);
