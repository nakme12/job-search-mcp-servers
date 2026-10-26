const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const RESUME_PATH = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - Frontend Engineer.pdf';

(async () => {
  let browser;
  try {
    console.log('[Greenford Reply] Connecting to browser...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 60000 });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('mail.google.com'));
    if (!page) {
      console.error('No Gmail tab found!');
      return;
    }
    await page.bringToFront();

    // Check if on Greenford email thread
    console.log('Ensuring Greenford thread is open...');
    await page.goto('https://mail.google.com/mail/u/0/#search/subject%3Aplace', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2500);

    // Click on row
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
      const targetRow = rows.find(r => r.innerText.includes('Greenford') || r.innerText.includes('place')) || rows[0];
      if (targetRow) {
        const link = targetRow.querySelector('.bog') || targetRow;
        link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }
    });
    await sleep(2500);

    // Locate or click reply
    let editor = await page.$('div[aria-label="Message Body"]');
    if (!editor) {
      console.log('Clicking Reply button...');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button[aria-label="Reply"], div[role="button"][aria-label*="Reply"], span[role="link"]'));
        for (const b of btns) {
          if (b.getAttribute('aria-label') === 'Reply' || b.innerText.trim() === 'Reply') {
            b.click();
            return;
          }
        }
      });
      await sleep(2000);
      editor = await page.$('div[aria-label="Message Body"]');
    }

    if (!editor) {
      console.error('Failed to locate compose/reply box!');
      return;
    }

    console.log('Focusing compose box...');
    await page.focus('div[aria-label="Message Body"]');
    await sleep(500);

    // Clear any previous draft text
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await sleep(400);

    const replyLines = [
      "Hi Greenford Hiring Team,",
      "",
      "Thank you for reaching out.",
      "",
      "I am a Software / Frontend Engineer with 1.5 years of experience specializing in React.js, Next.js, TypeScript, JavaScript, REST APIs, and responsive UI development. I have hands-on experience building clean, scalable components, responsive web interfaces, and API integrations.",
      "",
      "I have attached my updated resume for your review and would be glad to discuss relevant software or web development opportunities with your team.",
      "",
      "Portfolio: https://pratik-portfolio-nine-orcin.vercel.app",
      "LinkedIn: https://www.linkedin.com/in/pratik-patidar",
      "",
      "Thanks & Regards,",
      "Pratik Patidar",
      "pratikpatidar7990@gmail.com",
      "+91 82696 47990"
    ];

    console.log('Typing lines into editor...');
    for (const line of replyLines) {
      if (line === '') {
        await page.keyboard.press('Enter');
      } else {
        await page.keyboard.type(line, { delay: 1 });
        await page.keyboard.press('Enter');
      }
    }

    console.log('Text typed. Attaching resume...');
    await sleep(1500);

    const fileInput = await page.$('input[type="file"][name="Filedata"], input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(RESUME_PATH);
      console.log('File selected. Waiting 6s for upload completion...');
      await sleep(6000);
    } else {
      console.error('File input not found for attachment!');
    }

    // Verify attachment in DOM
    const attached = await page.evaluate(() => {
      return document.body.innerText.includes('Pratik Patidar Resume - Frontend Engineer.pdf');
    });
    console.log('Attachment upload status:', attached ? 'SUCCESSFULLY ATTACHED ✅' : 'NOT CONFIRMED');

    if (!attached) {
      console.error('Attachment verification failed! Aborting send to prevent empty application.');
      return;
    }

    // Send email using Ctrl+Enter
    console.log('Sending email via Ctrl+Enter...');
    await page.focus('div[aria-label="Message Body"]');
    await sleep(500);
    await page.keyboard.down('Control');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Control');

    console.log('Ctrl+Enter triggered. Waiting 5s...');
    await sleep(5000);

    // Fallback: Click send button if still open
    const stillOpen = await page.$('div[aria-label="Message Body"]');
    if (stillOpen) {
      console.log('Compose box still open, clicking explicit Send button...');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('div[role="button"]'));
        const sendBtn = btns.find(b => b.innerText.trim() === 'Send' || b.getAttribute('aria-label')?.startsWith('Send'));
        if (sendBtn) sendBtn.click();
      });
      await sleep(4000);
    }

    // Verify in Sent Folder (Rule 19)
    console.log('Verifying in Sent Folder (Rule 19)...');
    await page.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3000);

    const sentVerification = await page.evaluate(() => {
      const firstRow = document.querySelector('tr[role="row"], tr.zA');
      if (!firstRow) return { found: false };
      const text = firstRow.innerText;
      return {
        found: true,
        textSnippet: text.replace(/\n+/g, ' | ')
      };
    });

    console.log('Sent folder assertion:', JSON.stringify(sentVerification, null, 2));

  } catch (err) {
    console.error('Error during reply dispatch:', err.message);
  } finally {
    if (browser) await browser.disconnect();
  }
})();
