import puppeteer from 'puppeteer-core';
import path from 'path';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('mail.google.com'));

  if (!page) {
    page = await browser.newPage();
    await page.goto('https://mail.google.com/mail/u/1/#inbox', { waitUntil: 'domcontentloaded' });
  }

  await page.bringToFront();
  await new Promise(r => setTimeout(r, 2000));

  // Click Compose
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('div[role="button"], div[gh="cm"]')).find(b => (b.innerText || '').toLowerCase().includes('compose'));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  // Focus and fill recipient
  console.log('Filling recipient: contact@anuyogsoftwares.com');
  const recipientInput = await page.$('input[aria-label="To recipients"], input[peoplekit-id]');
  if (recipientInput) {
    await recipientInput.type('contact@anuyogsoftwares.com', { delay: 20 });
    await page.keyboard.press('Enter');
  }

  // Fill Subject
  console.log('Filling subject...');
  const subjectInput = await page.$('input[name="subjectbox"]');
  if (subjectInput) {
    await subjectInput.type('Application for Software Development Engineer I (Indore) - Pratik Patidar', { delay: 20 });
  }

  // Fill Body
  console.log('Filling email body...');
  const bodyText = `Hi Anuyog Softwares Team,

I came across your opening for the Software Development Engineer I role in Indore (Job ID: JD-2026-021) and wanted to apply.

I am a Frontend / Software Engineer with 1.5 years of experience specializing in React.js, Next.js, TypeScript, JavaScript, REST APIs, and full-stack development. I have hands-on experience building clean, responsive interfaces, shipping production features, and end-to-end web applications.

I am based locally in Indore, available to join immediately, and eager to contribute to the engineering team.

I have attached my updated resume for your review.

Portfolio: https://pratik-portfolio-nine-orcin.vercel.app
GitHub: https://github.com/pratikpatidar
LinkedIn: https://www.linkedin.com/in/pratik-patidar

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990`;

  const bodyInput = await page.$('div[aria-label="Message Body"], div[role="textbox"]');
  if (bodyInput) {
    await bodyInput.click();
    await page.keyboard.type(bodyText, { delay: 10 });
  }

  // Attach Resume
  const resumePath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
  console.log('Attaching resume:', resumePath);
  const fileInput = await page.$('input[type="file"][name="Filedata"]');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    console.log('Upload initiated. Waiting for attachment upload...');
    await new Promise(r => setTimeout(r, 6000));
  }

  // Pre-send screenshot (stopping right here for user review/send)
  await page.screenshot({ path: 'screenshots/2026-10-13/anuyog_gmail_draft_ready.png' });
  console.log('Gmail compose ready and pre-send screenshot saved!');

})();
