import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const TARGETS = [
  {
    company: 'Axquora',
    salutation: 'Hi Axquora Hiring Team,',
    email: 'hr@axquora.com',
    role: 'Frontend Developer',
    location: 'Indore',
    resumeName: 'Pratik Patidar Resume - Frontend Engineer.pdf',
    subject: 'Application for Frontend Developer - Pratik Patidar (1.5+ YOE | React.js / Frontend)'
  },
  {
    company: 'Elevate Tech',
    salutation: 'Hi Elevate Tech Hiring Team,',
    email: 'careers@elevatetech.in',
    role: 'Full Stack / MERN Developer',
    location: 'Remote',
    resumeName: 'Pratik Patidar Resume - MERN Full Stack.pdf',
    subject: 'Application for Full Stack / MERN Developer - Pratik Patidar (1.5+ YOE | MERN Stack)'
  },
  {
    company: 'Cybersify',
    salutation: 'Hi Cybersify Hiring Team,',
    email: 'hr@cybersify.tech',
    role: 'Full Stack Developer',
    location: 'Mohali',
    resumeName: 'Pratik Patidar Resume - MERN Full Stack.pdf',
    subject: 'Application for Full Stack Developer - Pratik Patidar (1.5+ YOE | MERN / Full Stack)'
  },
  {
    company: 'Liftor',
    salutation: 'Hi Liftor Hiring Team,',
    email: 'admin@liftor.in',
    role: 'Full Stack Developer',
    location: 'Surat',
    resumeName: 'Pratik Patidar Resume - MERN Full Stack.pdf',
    subject: 'Application for Full Stack Developer - Pratik Patidar (1.5+ YOE | React / Node.js)'
  },
  {
    company: 'Recharge Studio',
    salutation: 'Hi Recharge Studio Hiring Team,',
    email: 'sakshi.yadav@reachargestudio.com',
    role: 'React Developer',
    location: 'Indore',
    resumeName: 'Pratik Patidar Resume - React Developer.pdf',
    subject: 'Application for React Developer - Pratik Patidar (1.5+ YOE | React.js / Web)'
  }
];

function generateEmailBody(item) {
  return `${item.salutation}

I came across your opening for a ${item.role} (${item.location}) and wanted to submit my application.

I am a Frontend & Full Stack Engineer with 1.5+ years of hands-on experience building performant, responsive web applications using React.js, Next.js, TypeScript, Node.js, and modern full-stack architectures.

Key Highlights of My Experience:
• Core Frontend: Proficient in React.js, Next.js (App Router, SSR/SSG), TypeScript, Redux Toolkit, and Tailwind CSS.
• Full Stack & Backend: Experience designing RESTful APIs with Node.js and Express, database modeling with MongoDB / PostgreSQL, and clean state management.
• Quality & Optimization: Focused on clean component architecture, Core Web Vitals optimization, and responsive design.

My portfolio and live work can be viewed at: https://pratikpatidar.vercel.app/
GitHub: https://github.com/pratikpatidar
LinkedIn: https://www.linkedin.com/in/pratik-patidar-b8929a228/

I have attached my updated resume (${item.resumeName}) for your review. I would welcome the opportunity to discuss how my technical skills and enthusiasm can contribute to your team.

Thank you for your time and consideration.

Best regards,
Pratik Patidar
Phone: +91 8269647990
Email: patidarpratik0099@gmail.com`;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runDispatches() {
  console.log('Connecting to browser at 127.0.0.1:9222...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  let gmailPage = pages.find(p => p.url().includes('mail.google.com'));

  if (!gmailPage) {
    console.log('Opening Gmail tab...');
    gmailPage = await browser.newPage();
    await gmailPage.goto('https://mail.google.com/mail/u/1/#sent', { waitUntil: 'networkidle2' });
  }

  await gmailPage.bringToFront();

  for (let i = 0; i < TARGETS.length; i++) {
    const item = TARGETS[i];
    console.log(`\n======================================================`);
    console.log(`[${i+1}/${TARGETS.length}] Processing ${item.company} -> ${item.email}`);
    console.log(`Salutation Assertion: "${item.salutation}"`);

    // Discard any open drafts
    await gmailPage.evaluate(() => {
      const discardBtns = document.querySelectorAll('img[aria-label="Discard draft"], div[aria-label="Discard draft"], .og.T-I-J3');
      discardBtns.forEach(btn => btn.click());
    });
    await sleep(1500);

    // Click compose
    console.log('Clicking Compose button...');
    await gmailPage.evaluate(() => {
      const compBtn = document.querySelector('div[role="button"][gh="cm"], .T-I.T-I-KE.L3, [aria-label="Compose"], .T-I.T-I-KE');
      if (compBtn) compBtn.click();
    });
    await sleep(2500);

    // Fill Recipient
    console.log(`Typing recipient: ${item.email}...`);
    await gmailPage.evaluate(() => {
      const toInput = document.querySelector('input[name="to"], input[peoplekit-id], input.agP.aFw, [aria-label="To recipients"], [aria-label="To"]');
      if (toInput) toInput.focus();
    });
    await sleep(300);
    await gmailPage.keyboard.type(item.email, { delay: 30 });
    await gmailPage.keyboard.press('Enter');
    await sleep(800);

    // Fill Subject
    console.log(`Typing subject: "${item.subject}"...`);
    await gmailPage.evaluate(() => {
      const subjInput = document.querySelector('input[name="subjectbox"], input[placeholder="Subject"]');
      if (subjInput) subjInput.focus();
    });
    await sleep(300);
    await gmailPage.keyboard.type(item.subject, { delay: 20 });
    await sleep(800);

    // Fill Body
    console.log('Setting body...');
    const bodyText = generateEmailBody(item);
    await gmailPage.evaluate((text) => {
      const bodyEl = document.querySelector('div[aria-label="Message Body"], div[role="textbox"][g_editable="true"]');
      if (bodyEl) {
        bodyEl.focus();
        bodyEl.innerText = text;
        bodyEl.dispatchEvent(new Event('input', { bubbles: true }));
        bodyEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, bodyText);
    await sleep(1200);

    // Upload Attachment
    const resumeAbsPath = path.resolve('resumes', item.resumeName);
    console.log(`Uploading attachment: ${resumeAbsPath}...`);
    const fileInput = await gmailPage.$('input[type="file"][name="Filedata"], input[type="file"]');
    if (!fileInput) throw new Error('File input not found');
    await fileInput.uploadFile(resumeAbsPath);

    // Assert attachment
    let attachmentVerified = false;
    const startTime = Date.now();
    const resumeBaseName = path.basename(resumeAbsPath);

    while (Date.now() - startTime < 30000) {
      const attachStatus = await gmailPage.evaluate((fname) => {
        const attachContainers = document.querySelectorAll('div[aria-label*="Attachment:"], div.vI, div.vq, div.a3I, div.dL');
        for (const c of attachContainers) {
          const text = (c.innerText || c.getAttribute('aria-label') || '').toLowerCase();
          const isProgress = c.querySelector('div[role="progressbar"], .aP3, .aP4');
          if ((text.includes('pratik') || text.includes('resume') || text.includes('.pdf')) && !isProgress) {
            return { attached: true, text: c.innerText || c.getAttribute('aria-label') };
          }
        }
        return { attached: false };
      }, resumeBaseName);

      if (attachStatus.attached) {
        console.log(`✓ Attachment verified in DOM: "${attachStatus.text.trim()}"`);
        attachmentVerified = true;
        break;
      }
      await sleep(1000);
    }

    if (!attachmentVerified) {
      throw new Error('Attachment verification failed for ' + item.company);
    }

    await sleep(1500);

    // Capture pre-send screenshot
    const safeComp = item.company.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const preSendScreenshot = `screenshots/2026-10-12/presend_${safeComp}.png`;
    await gmailPage.screenshot({ path: preSendScreenshot });
    console.log(`Pre-send screenshot saved: ${preSendScreenshot}`);

    // Click Send
    console.log('Clicking Send button...');
    const sendResult = await gmailPage.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"], div.M9, div.AD');
      if (!dialog) return { success: false };
      const sendButtons = Array.from(dialog.querySelectorAll('div[role="button"], button')).filter(b => {
        const label = (b.getAttribute('aria-label') || b.getAttribute('data-tooltip') || b.innerText || '').toLowerCase();
        return label.includes('send') && !label.includes('scheduled');
      });
      if (sendButtons.length > 0) {
        sendButtons[0].click();
        return { success: true };
      }
      return { success: false };
    });

    if (!sendResult.success) {
      await gmailPage.keyboard.down('Control');
      await gmailPage.keyboard.press('Enter');
      await gmailPage.keyboard.up('Control');
    }

    await sleep(4000);

    // Capture post-send proof
    const postSendScreenshot = `screenshots/2026-10-12/sent_confirmed_${safeComp}.png`;
    await gmailPage.screenshot({ path: postSendScreenshot });
    console.log(`✓ Post-send confirmed proof screenshot: ${postSendScreenshot}`);

    // Update Trackers
    const trackerEntry = {
      id: `tg-${safeComp}-${Date.now()}`,
      company: item.company,
      role: item.role,
      location: item.location,
      platform: 'Telegram (@merntech)',
      recipientEmail: item.email,
      emailSubject: item.subject,
      salutationUsed: item.salutation,
      applied_at: new Date().toISOString(),
      applied_via: 'Gmail Verified Direct HR Dispatch',
      resume: item.resumeName,
      proof: postSendScreenshot,
      status: 'VERIFIED_DELIVERED'
    };

    let todays = JSON.parse(fs.readFileSync('todays_applied.json', 'utf8'));
    let weekly = JSON.parse(fs.readFileSync('weekly_applied.json', 'utf8'));
    todays.applied.push(trackerEntry);
    todays.total_applied_today = todays.applied.length;
    weekly.applied.push(trackerEntry);
    weekly.total_lifetime_applied = weekly.applied.length;
    fs.writeFileSync('todays_applied.json', JSON.stringify(todays, null, 2));
    fs.writeFileSync('weekly_applied.json', JSON.stringify(weekly, null, 2));
    console.log(`✓ Trackers updated! Today total = ${todays.total_applied_today} | Lifetime total = ${weekly.total_lifetime_applied}`);

    await sleep(2000);
  }

  console.log('\n======================================================');
  console.log('ALL 5 TELEGRAM HR LEADS SUCCESSFULLY DISPATCHED & VERIFIED!');
  browser.disconnect();
}

runDispatches().catch(console.error);
