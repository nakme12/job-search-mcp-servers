import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const verifiedJobs = JSON.parse(fs.readFileSync('verified_todays_2026-10-14.json', 'utf8')).jobs || [];
const target = verifiedJobs.find(j => j.email === 'contact@procyn.in');

if (!target) {
  console.error('Target job not found in verified_todays_2026-10-14.json');
  process.exit(1);
}

const resumePath = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';
if (!fs.existsSync(resumePath)) {
  console.error('Resume PDF does not exist:', resumePath);
  process.exit(1);
}

async function sendEmail() {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' });
  const pages = await browser.pages();
  const gmailPage = pages.find(p => p.url().includes('mail.google.com'));

  if (!gmailPage) {
    console.error('Active Gmail tab not found!');
    process.exit(1);
  }

  await gmailPage.bringToFront();
  console.log('Attached to Gmail tab:', await gmailPage.title());

  // Click Compose button
  console.log('Clicking Compose...');
  await gmailPage.evaluate(() => {
    const compose = Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText.includes('Compose') || b.getAttribute('aria-label')?.includes('Compose'));
    if (compose) compose.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  // Find active compose modal
  const subjectText = 'Full Stack Developer (MERN / React) Application - Pratik Patidar (Indore, MP)';
  const bodyText = `Dear Hiring Team,\n\nI came across your opening for a Full Stack Developer (MERN / React) at Procyn .in and wanted to apply for the role.\n\nI'm a Frontend & MERN Stack Engineer with 1.5 years of experience, mainly working with React.js, Next.js, Node.js, Express, TypeScript, JavaScript, REST APIs, and responsive UI development. I have hands-on experience building reusable components, responsive interfaces, and API-integrated web applications.\n\nI'm based in Indore and would be glad to discuss the opportunity further.\n\nI've attached my updated resume for your review.\n\nLinkedIn: https://www.linkedin.com/in/pratik-patidar\nPortfolio: https://pratik-portfolio-nine-orcin.vercel.app\n\nThanks & Regards,\nPratik Patidar\npratikpatidar7990@gmail.com\n+91 82696 47990`;

  console.log('Populating Recipient, Subject, and Body...');
  await gmailPage.evaluate((to, sub, body) => {
    // Recipient input
    const toInput = document.querySelector('input[aria-label="To recipients"]') || document.querySelector('textarea[name="to"]') || document.querySelector('input[name="to"]');
    if (toInput) {
      toInput.focus();
      toInput.value = to;
      toInput.dispatchEvent(new Event('input', { bubbles: true }));
      toInput.dispatchEvent(new Event('change', { bubbles: true }));
      toInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    }

    // Subject input
    const subInput = document.querySelector('input[name="subjectbox"]') || document.querySelector('input[placeholder="Subject"]');
    if (subInput) {
      subInput.focus();
      subInput.value = sub;
      subInput.dispatchEvent(new Event('input', { bubbles: true }));
      subInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Body
    const bodyDiv = document.querySelector('div[aria-label="Message Body"]') || document.querySelector('div[role="textbox"]');
    if (bodyDiv) {
      bodyDiv.focus();
      bodyDiv.innerText = body;
      bodyDiv.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, target.email, subjectText, bodyText);

  await new Promise(r => setTimeout(r, 1500));

  // Attach resume file
  console.log('Attaching resume:', resumePath);
  const fileInputs = await gmailPage.$$('input[type="file"]');
  if (fileInputs.length > 0) {
    const fileInput = fileInputs[fileInputs.length - 1];
    await fileInput.uploadFile(resumePath);
    console.log('File uploaded to input element. Waiting for upload to complete...');
  } else {
    console.error('File input not found');
  }

  // Wait 4 seconds for upload progress bar
  await new Promise(r => setTimeout(r, 4000));

  // Take screenshot of composed email
  await gmailPage.screenshot({ path: 'screenshots/composed_procyn_proof.png' });
  console.log('Saved proof screenshot to screenshots/composed_procyn_proof.png');

  // Verify attachment DOM
  const attachmentVerified = await gmailPage.evaluate(() => {
    const att = document.querySelector('div[aria-label*="Attachment"]') || Array.from(document.querySelectorAll('div')).find(d => d.innerText && d.innerText.includes('Pratik Patidar Resume') && d.innerText.includes('.pdf'));
    return !!att;
  });
  console.log('Attachment verified in DOM:', attachmentVerified);

  // Click Send button
  console.log('Clicking Send button...');
  await gmailPage.evaluate(() => {
    const sendBtn = Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText.trim() === 'Send' || b.getAttribute('aria-label')?.includes('Send'));
    if (sendBtn) sendBtn.click();
  });

  // Wait 3 seconds and navigate to Sent folder to assert DOM
  await new Promise(r => setTimeout(r, 3000));
  console.log('Navigating to Sent folder for physical proof assertion...');
  await gmailPage.goto('https://mail.google.com/mail/u/1/#sent', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));

  const sentAsserted = await gmailPage.evaluate((to) => {
    const rows = Array.from(document.querySelectorAll('tr')).slice(0, 5);
    return rows.some(r => r.innerText.includes(to) || r.innerText.includes('contact@procyn.in'));
  }, target.email);

  await gmailPage.screenshot({ path: 'screenshots/sent_procyn_proof.png' });
  console.log('Sent folder verified:', sentAsserted);

  // Append to applied_todays_2026-10-14.json
  const appliedRecord = {
    company: 'Procyn .in',
    role: target.role,
    recipient: target.email,
    channel: 'Direct Email (Gmail CDP)',
    subject: subjectText,
    resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
    timestamp: new Date().toISOString(),
    status: sentAsserted ? 'Applied & Verified (Sent Folder Assertion)' : 'Dispatched',
    proof_screenshots: [
      'screenshots/composed_procyn_proof.png',
      'screenshots/sent_procyn_proof.png'
    ]
  };

  const todaysAppliedFile = 'applied_todays_2026-10-14.json';
  const currentApplied = JSON.parse(fs.readFileSync(todaysAppliedFile, 'utf8'));
  currentApplied.jobs.push(appliedRecord);
  currentApplied.total = currentApplied.jobs.length;
  fs.writeFileSync(todaysAppliedFile, JSON.stringify(currentApplied, null, 2));

  console.log('Successfully logged to applied_todays_2026-10-14.json!');
  process.exit(0);
}

sendEmail().catch(err => {
  console.error('Error in sendEmail:', err);
  process.exit(1);
});
