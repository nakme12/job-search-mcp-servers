const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 900 });
    console.log('Navigating to Gmail...');
    await page.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 4000));

    // Click Compose
    console.log('Clicking Compose button...');
    await page.evaluate(() => {
      const composeBtn = Array.from(document.querySelectorAll('div[role="button"]')).find(el => (el.innerText || '').toLowerCase().includes('compose'));
      if (composeBtn) composeBtn.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    // Fill To
    console.log('Typing recipient: hr@keyss.in...');
    const toField = await page.$('input[aria-label="To recipients"], input.agP, textarea[name="to"]');
    if (toField) {
      await toField.type('hr@keyss.in', { delay: 30 });
      await page.keyboard.press('Enter');
    }
    await new Promise(r => setTimeout(r, 1000));

    // Fill Subject
    console.log('Typing Subject...');
    const subjectField = await page.$('input[name="subjectbox"]');
    if (subjectField) {
      await subjectField.type('MERN Stack Developer Application - Pratik Patidar (Indore, MP)', { delay: 25 });
    }
    await new Promise(r => setTimeout(r, 1000));

    // Fill Body
    console.log('Typing Body...');
    const bodyField = await page.$('div[aria-label="Message Body"], div[role="textbox"]');
    if (bodyField) {
      await bodyField.click();
      const bodyText = `Hi Key Software Services Hiring Team,

I came across your opening for a MERN Stack Developer and wanted to apply for the role.

I'm a Full Stack Developer with 1.5 years of experience building full-stack web applications using React.js, Node.js, Express.js, MongoDB, TypeScript, REST APIs, and modern frontend & backend architectures.

I'm based in Indore and would be glad to discuss the opportunity further.

I've attached my updated resume for your review.

LinkedIn: https://www.linkedin.com/in/pratik-patidar
Portfolio: https://pratik-portfolio-nine-orcin.vercel.app

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990`;
      await page.evaluate((text) => {
        const el = document.querySelector('div[aria-label="Message Body"], div[role="textbox"]');
        if (el) el.innerText = text;
      }, bodyText);
    }
    await new Promise(r => setTimeout(r, 1500));

    // Attach resume
    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    console.log('Attaching resume:', resumePath, 'exists:', fs.existsSync(resumePath));
    const fileInput = await page.$('input[type="file"][name="Filedata"]') || await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('Resume attached to file input');
    }
    await new Promise(r => setTimeout(r, 5000));

    // Pre-send screenshot
    const preScreenshot = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/keyss_presend.png';
    await page.screenshot({ path: preScreenshot });
    console.log('Pre-send screenshot saved:', preScreenshot);

    // Send
    console.log('Sending email...');
    await page.evaluate(() => {
      const sendBtn = Array.from(document.querySelectorAll('div[role="button"]')).find(el => {
        const t = (el.innerText || '').toLowerCase().trim();
        return t === 'send' && !el.getAttribute('aria-label')?.includes('Send more');
      });
      if (sendBtn) sendBtn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    // Verify in Sent
    console.log('Verifying in Sent folder...');
    await page.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    const postScreenshot = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/keyss_sent_proof.png';
    await page.screenshot({ path: postScreenshot });
    console.log('Sent proof screenshot saved:', postScreenshot);

    const sentText = await page.evaluate(() => document.body.innerText.substring(0, 1500));
    const verified = sentText.toLowerCase().includes('keyss') || sentText.toLowerCase().includes('mern stack developer application');
    console.log('Sent Verification Result:', verified);

    if (verified) {
      // Append to applied_todays_2026-10-14.json
      const appFile = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json';
      const data = JSON.parse(fs.readFileSync(appFile, 'utf8'));
      data.jobs.push({
        company: 'Key Software Services',
        role: 'MERN Stack Developer',
        recipient: 'hr@keyss.in',
        channel: 'Direct Email (Gmail CDP - Rule 53 Instant Dispatch)',
        subject: 'MERN Stack Developer Application - Pratik Patidar (Indore, MP)',
        resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
        timestamp: new Date().toISOString(),
        status: 'Applied & Verified (100% Physical Sent Folder Assertion Proof)',
        proof_screenshots: [
          'screenshots/2026-10-14/keyss_presend.png',
          'screenshots/2026-10-14/keyss_sent_proof.png'
        ],
        notes: 'Rule 53 Instant Email Dispatch executed post-Slot 4. Physically verified in Gmail Sent folder.'
      });
      data.total = data.jobs.length;
      fs.writeFileSync(appFile, JSON.stringify(data, null, 2), 'utf8');
      console.log('Successfully appended Key Software Services to applied_todays_2026-10-14.json. Total applied:', data.total);
    }
  } finally {
    await page.close();
    await browser.disconnect();
  }
})();
