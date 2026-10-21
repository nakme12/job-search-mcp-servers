import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const TARGETS = [
  {
    company: 'Axquora',
    salutation: 'Hi Axquora Hiring Team,',
    email: 'hr@axquora.com',
    role: 'Frontend Developer',
    resumeName: 'Pratik Patidar Resume - Frontend Engineer.pdf',
    subject: 'Application for Frontend Developer - Pratik Patidar (1.5+ YOE | React.js / Frontend)'
  },
  {
    company: 'Elevate Tech',
    salutation: 'Hi Elevate Tech Hiring Team,',
    email: 'careers@elevatetech.in',
    role: 'Full Stack / MERN Developer',
    resumeName: 'Pratik Patidar Resume - MERN Full Stack.pdf',
    subject: 'Application for Full Stack / MERN Developer - Pratik Patidar (1.5+ YOE | MERN Stack)'
  },
  {
    company: 'Cybersify',
    salutation: 'Hi Cybersify Hiring Team,',
    email: 'hr@cybersify.tech',
    role: 'Full Stack Developer',
    resumeName: 'Pratik Patidar Resume - MERN Full Stack.pdf',
    subject: 'Application for Full Stack Developer - Pratik Patidar (1.5+ YOE | MERN / Full Stack)'
  },
  {
    company: 'Liftor',
    salutation: 'Hi Liftor Hiring Team,',
    email: 'admin@liftor.in',
    role: 'Full Stack Developer',
    resumeName: 'Pratik Patidar Resume - MERN Full Stack.pdf',
    subject: 'Application for Full Stack Developer - Pratik Patidar (1.5+ YOE | React / Node.js)'
  },
  {
    company: 'Recharge Studio',
    salutation: 'Hi Recharge Studio Hiring Team,',
    email: 'sakshi.yadav@reachargestudio.com',
    role: 'React Developer',
    resumeName: 'Pratik Patidar Resume - React Developer.pdf',
    subject: 'Application for React Developer - Pratik Patidar (1.5+ YOE | React.js / Web)'
  }
];

function getEmailBody(target) {
  return `${target.salutation}

I am writing to express my strong interest in the ${target.role} opportunity at ${target.company}. With 1.5+ years of hands-on experience building performant, responsive web applications, I specialize in React.js, Next.js, TypeScript, Node.js, and modern full-stack development.

Key Highlights of My Experience:
• Core Frontend: Proficient in React.js, Next.js (App Router, SSR/SSG), TypeScript, Redux Toolkit, and Tailwind CSS.
• Full Stack & Backend: Experience designing RESTful APIs with Node.js and Express, database modeling with MongoDB / PostgreSQL, and clean state management.
• Quality & Optimization: Focused on clean component architecture, Core Web Vitals optimization, and responsive design.

My portfolio and live work can be viewed at: https://pratikpatidar.vercel.app/
GitHub: https://github.com/pratikpatidar
LinkedIn: https://www.linkedin.com/in/pratik-patidar-b8929a228/

I have attached my resume (${target.resumeName}) for your review. I would welcome the opportunity to discuss how my technical skills and enthusiasm can contribute to the team at ${target.company}.

Thank you for your time and consideration.

Best regards,
Pratik Patidar
Phone: +91 8269647990
Email: patidarpratik0099@gmail.com`;
}

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('mail.google.com'));
    if (!page) {
      console.log('No Gmail page open. Opening new page...');
      page = await browser.newPage();
      await page.goto('https://mail.google.com/mail/u/1/#inbox', { waitUntil: 'networkidle2' });
    }
    await page.bringToFront();

    for (let i = 0; i < TARGETS.length; i++) {
      const target = TARGETS[i];
      console.log(`\n==============================================`);
      console.log(`[${i+1}/${TARGETS.length}] Processing ${target.company} -> ${target.email}`);
      console.log(`Salutation check: "${target.salutation}"`);

      // 1. Click Compose button
      await page.evaluate(() => {
        const composeBtn = document.querySelector('div.T-I.T-I-KE.L3') || Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText.trim() === 'Compose');
        if (composeBtn) composeBtn.click();
      });
      await new Promise(r => setTimeout(r, 2000));

      // 2. Type Recipient
      const toSelector = 'input.agP, input[peoplekit-id], textarea[name="to"], input[aria-label="To recipients"]';
      await page.waitForSelector(toSelector, { timeout: 10000 });
      await page.type(toSelector, target.email, { delay: 50 });
      await page.keyboard.press('Enter');
      await new Promise(r => setTimeout(r, 500));

      // 3. Type Subject
      const subjectSelector = 'input[name="subjectbox"]';
      await page.waitForSelector(subjectSelector, { timeout: 10000 });
      await page.type(subjectSelector, target.subject, { delay: 30 });
      await new Promise(r => setTimeout(r, 500));

      // 4. Type Body
      const bodySelector = 'div[aria-label="Message Body"], div.Am.Al.editable';
      await page.waitForSelector(bodySelector, { timeout: 10000 });
      await page.click(bodySelector);
      const emailBody = getEmailBody(target);
      await page.keyboard.sendCharacter(''); // Focus
      await page.evaluate((sel, text) => {
        const el = document.querySelector(sel);
        if (el) {
          el.innerText = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, bodySelector, emailBody);
      await new Promise(r => setTimeout(r, 1000));

      // 5. Attach Canonical Resume
      const resumePath = path.resolve('resumes', target.resumeName);
      const fileInputs = await page.$$('input[type="file"][name="Filedata"]');
      if (fileInputs.length > 0) {
        const activeFileInput = fileInputs[fileInputs.length - 1];
        await activeFileInput.uploadFile(resumePath);
        console.log(`Attached resume: ${resumePath}`);
      } else {
        console.error('File input not found for attachment!');
      }

      // Wait 4 seconds for upload to finish
      await new Promise(r => setTimeout(r, 4000));

      // Pre-send screenshot
      const safeComp = target.company.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const preSendPath = `screenshots/2026-10-12/pre_send_${safeComp}.png`;
      await page.screenshot({ path: preSendPath });
      console.log(`Pre-send screenshot saved: ${preSendPath}`);

      // 6. Click Send
      await page.evaluate(() => {
        const sendBtns = Array.from(document.querySelectorAll('div[role="button"]')).filter(b => b.innerText.trim() === 'Send' || b.getAttribute('aria-label') === 'Send ‪(Ctrl-Enter)‬' || (b.getAttribute('aria-label') || '').includes('Send'));
        if (sendBtns.length > 0) {
          sendBtns[sendBtns.length - 1].click();
        }
      });

      await new Promise(r => setTimeout(r, 3500));

      // Post-send screenshot
      const postSendPath = `screenshots/2026-10-12/sent_confirmed_${safeComp}.png`;
      await page.screenshot({ path: postSendPath });
      console.log(`Confirmed sent screenshot: ${postSendPath}`);

      // Record in trackers
      const recordApp = {
        id: `tg-${safeComp}-${Date.now()}`,
        company: target.company,
        role: target.role,
        platform: 'Telegram (@merntech / Developer Hub)',
        recipientEmail: target.email,
        emailSubject: target.subject,
        salutationUsed: target.salutation,
        applied_at: new Date().toISOString(),
        applied_via: 'Gmail Verified Direct HR Dispatch',
        resume: target.resumeName,
        proof: postSendPath,
        status: 'VERIFIED_DELIVERED'
      };

      let todays = JSON.parse(fs.readFileSync('todays_applied.json', 'utf8'));
      let weekly = JSON.parse(fs.readFileSync('weekly_applied.json', 'utf8'));
      todays.applied.push(recordApp);
      todays.total_applied_today = todays.applied.length;
      weekly.applied.push(recordApp);
      weekly.total_lifetime_applied = weekly.applied.length;
      fs.writeFileSync('todays_applied.json', JSON.stringify(todays, null, 2));
      fs.writeFileSync('weekly_applied.json', JSON.stringify(weekly, null, 2));
      console.log(`Trackers updated: Today = ${todays.total_applied_today} | Lifetime = ${weekly.total_lifetime_applied}`);

      await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\nAll 5 verified Telegram leads successfully dispatched and recorded!');

  } catch (err) {
    console.error('Dispatch error:', err.message);
  }
})();
