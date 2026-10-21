import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) {
    console.error('WhatsApp tab not found');
    await browser.disconnect();
    return;
  }

  // 1. Search and open 97272 chat
  console.log('Searching for 97272 in WhatsApp search bar...');
  const searchInput = await wa.$('#side div[contenteditable="true"]');
  if (searchInput) {
    await searchInput.click();
    await sleep(500);
    // clear and type
    await wa.evaluate(el => el.textContent = '', searchInput);
    await searchInput.type('97272 26776', { delay: 100 });
    await sleep(2000);
    await wa.keyboard.press('Enter');
    await sleep(2500);
  }

  // Verify Header
  const header = await wa.evaluate(() => document.querySelector('#main header')?.innerText?.replace(/\n+/g, ' '));
  console.log('Confirmed Active Chat Header:', header);
  if (!header || !header.includes('97272')) {
    console.error('Not the 97272 chat! Aborting for safety.');
    await browser.disconnect();
    return;
  }

  // 2. Prepare Message
  const messageText = `Hi Team ATS Software Solution,

Here are my details:

Name: Pratik Patidar
Location: Indore, Madhya Pradesh
Experienced / Fresher: Experienced (1.5+ Years)
Last Degree / Qualification: B.Tech in Computer Science & Engineering (2020–2024)
Last CTC: 2.16 LPA
Expected CTC: 5.20 LPA (Negotiable)
Position you applied for: Full Stack Developer
Work Mode: Comfortable with WFO

Portfolio: https://pratik-portfolio-nine-orcin.vercel.app
LinkedIn: https://www.linkedin.com/in/pratik-patidar

Thanks & Regards,
Pratik Patidar
+91 82696 47990`;

  // Focus message input box and type
  console.log('Focusing message input...');
  const msgInput = await wa.$('#main footer div[contenteditable="true"]');
  if (!msgInput) {
    console.error('Could not find WhatsApp message input box');
    await browser.disconnect();
    return;
  }

  await msgInput.click();
  await sleep(500);

  // Paste / type text safely
  await wa.evaluate((text) => {
    const el = document.querySelector('#main footer div[contenteditable="true"]');
    if (!el) return;
    el.focus();
    document.execCommand('insertText', false, text);
  }, messageText);
  await sleep(1000);

  // Send message
  console.log('Sending details message...');
  await wa.keyboard.press('Enter');
  await sleep(2500);

  // 3. Upload and send resume
  const resumePath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
  console.log('Uploading MERN Full Stack Resume:', resumePath);

  const fileInputs = await wa.$$('input[type="file"]');
  let docInput = null;
  for (const inp of fileInputs) {
    const accept = await inp.evaluate(el => el.getAttribute('accept'));
    if (accept === '*' || !accept.includes('image')) {
      docInput = inp;
      break;
    }
  }

  if (docInput) {
    await docInput.uploadFile(resumePath);
    console.log('Waiting for document preview modal...');
    await sleep(3500);

    const sentDoc = await wa.evaluate(() => {
      const sendBtn = document.querySelector('span[data-icon="send"]')?.closest('button') || 
                      document.querySelector('[aria-label="Send"]')?.closest('button') ||
                      document.querySelector('div[role="button"][aria-label="Send"]');
      if (sendBtn) {
        sendBtn.click();
        return true;
      }
      return false;
    });

    if (!sentDoc) {
      console.log('Falling back to Enter key for document modal...');
      await wa.keyboard.press('Enter');
    }
    await sleep(3000);
  } else {
    console.error('docInput not found');
  }

  // 4. Verification Screenshot
  await wa.screenshot({ path: 'screenshots/2026-10-14_wa_reply_97272.png' });
  console.log('SUCCESS: Details + Resume sent. Screenshot saved to screenshots/2026-10-14_wa_reply_97272.png');

  await browser.disconnect();
}

main().catch(console.error);
