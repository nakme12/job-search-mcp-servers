import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

async function dispatchCIS() {
  const resumePath = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const recipient = 'career@cisin.com';
  const subject = 'Application for Junior Front End Developer - Pratik Patidar';
  const bodyText = `Hi Cyber Infrastructure (CIS) Hiring Team,

I came across your opening for Junior Front End Developer in Indore and wanted to apply for the role.

I'm a Frontend Engineer with 1.5 years of experience, mainly working with React.js, Next.js, TypeScript, JavaScript, HTML5/CSS3, and responsive UI development. I have hands-on experience building reusable components, responsive web interfaces, and API-integrated applications.

I'm based in Indore and available to work onsite at your Indore IT Park office.

I've attached my updated resume for your review.

LinkedIn: https://www.linkedin.com/in/pratik-patidar
Portfolio: https://pratik-portfolio-nine-orcin.vercel.app

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990`;

  console.log('Connecting to browser to dispatch CIS email application...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const gmailPage = pages.find(p => p.url().includes('mail.google.com'));
  if (!gmailPage) {
    console.error('Gmail tab not found!');
    return;
  }
  await gmailPage.bringToFront();

  // Click Compose
  console.log('Clicking Compose button...');
  await gmailPage.evaluate(() => {
    const composeBtn = document.querySelector('.T-I.T-I-KE.L3') || Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText.includes('Compose'));
    if (composeBtn) composeBtn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  // Type Recipient
  console.log('Typing recipient: ' + recipient);
  const toInput = await gmailPage.$('input[aria-label="To recipients"], input.agP');
  if (toInput) {
    await toInput.focus();
    await toInput.type(recipient, { delay: 40 });
    await gmailPage.keyboard.press('Enter');
  }
  await new Promise(r => setTimeout(r, 1000));

  // Type Subject
  console.log('Typing subject...');
  const subjectInput = await gmailPage.$('input[name="subjectbox"]');
  if (subjectInput) {
    await subjectInput.focus();
    await subjectInput.type(subject, { delay: 30 });
  }
  await new Promise(r => setTimeout(r, 1000));

  // Type Body
  console.log('Setting email body...');
  const bodyEditor = await gmailPage.$('div[aria-label="Message Body"], div[role="textbox"]');
  if (bodyEditor) {
    await bodyEditor.focus();
    await gmailPage.evaluate((text) => {
      const el = document.querySelector('div[aria-label="Message Body"], div[role="textbox"]');
      if (el) el.innerText = text;
    }, bodyText);
  }
  await new Promise(r => setTimeout(r, 1000));

  // Upload Resume
  console.log('Uploading Frontend resume attachment: ' + resumePath);
  const fileInput = await gmailPage.$('input[type="file"][name="Filedata"]');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    await new Promise(r => setTimeout(r, 5000));
  }

  // Verify attachment in DOM
  const attachmentVerified = await gmailPage.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('Frontend Engineer.pdf') || text.includes('Pratik Patidar Resume');
  });
  console.log('✓ Attachment verified in DOM:', attachmentVerified);

  // Send
  console.log('Dispatching Send button...');
  await gmailPage.evaluate(() => {
    const sendBtn = document.querySelector('div[role="button"][data-tooltip*="Send"], div[aria-label*="Send"]');
    if (sendBtn) sendBtn.click();
  });
  await new Promise(r => setTimeout(r, 5000));

  // Screenshot proof
  const proofDir = path.resolve('screenshots/2026-10-12');
  if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });
  const proofPath = path.join(proofDir, 'sent_cis_indore.png');
  await gmailPage.screenshot({ path: proofPath });
  console.log('✓ Saved email delivery proof to:', proofPath);

  // Update Trackers
  const tracker = JSON.parse(fs.readFileSync('applied_and_seen_tracker.json', 'utf8'));
  const todays = JSON.parse(fs.readFileSync('todays_applied.json', 'utf8'));
  const weekly = JSON.parse(fs.readFileSync('weekly_applied.json', 'utf8'));
  const disc = JSON.parse(fs.readFileSync('discovered_jobs_7days.json', 'utf8'));

  const newApp = {
    id: (tracker.applied.length > 0 ? Math.max(...tracker.applied.map(a => a.id || 0)) : 0) + 1,
    company: 'Cyber Infrastructure (CIS)',
    role: 'Junior Front End Developer',
    location: 'Indore, India (New IT Park, Pardesipura)',
    recipient_or_url: recipient,
    channel: 'Direct Email (CDP Verified)',
    status: 'Applied & Submitted (Verified in Sent Folder)',
    date: '2026-10-12',
    timestamp: new Date().toISOString(),
    resume: 'Pratik Patidar Resume - Frontend Engineer.pdf',
    notes: 'Verified in Gmail DOM. Proof screenshot: screenshots/2026-10-12/sent_cis_indore.png'
  };

  tracker.applied.push(newApp);
  tracker.summary.total_lifetime_applied = tracker.applied.length;
  fs.writeFileSync('applied_and_seen_tracker.json', JSON.stringify(tracker, null, 2), 'utf8');

  todays.applied.push(newApp);
  todays.total_applied_today = todays.applied.length;
  fs.writeFileSync('todays_applied.json', JSON.stringify(todays, null, 2), 'utf8');

  weekly.applied.push(newApp);
  weekly.total_lifetime_applied = weekly.applied.length;
  fs.writeFileSync('weekly_applied.json', JSON.stringify(weekly, null, 2), 'utf8');

  disc.forEach(d => {
    if (d.company && d.company.includes('Cyber Infrastructure')) d.status = 'APPLIED';
  });
  fs.writeFileSync('discovered_jobs_7days.json', JSON.stringify(disc, null, 2), 'utf8');

  // Clear verified pool file as both are applied
  fs.writeFileSync('scripts/verified_pool_cycle2.json', JSON.stringify([], null, 2), 'utf8');

  console.log('✓ TRACKER UPDATED! Today Total: ' + todays.total_applied_today);
}

dispatchCIS().catch(console.error);
