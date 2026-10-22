const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    console.log('[Reply Dispatcher] Connecting to Brave...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('mail.google.com'));
    if (!page) {
      console.error('No Gmail tab found!');
      return;
    }
    await page.bringToFront();

    // Check if compose box is already present or needs click
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
      console.error('Failed to locate compose box!');
      return;
    }

    console.log('Focusing compose box...');
    await page.focus('div[aria-label="Message Body"]');
    await sleep(500);

    // Select all and delete any existing draft text
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await sleep(500);

    const replyLines = [
      "Hi Shweta,",
      "",
      "Thank you for reaching out. Please find the requested details below:",
      "",
      "1. Total Experience: 1.5 Years",
      "2. Relevant Experience: 1.5 Years",
      "3. Current CTC: ₹2.16 LPA",
      "4. Expected CTC: ₹4.8 – 8 LPA (Negotiable)",
      "5. Notice Period: 15 Days (Negotiable)",
      "6. Current Location: Indore, Madhya Pradesh",
      "7. Updated Resume: Attached",
      "",
      "Please let me know if you need any further information. Looking forward to the next steps.",
      "",
      "Thanks & Regards,",
      "Pratik Patidar",
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

    console.log('Text typed successfully.');
    await sleep(1500);

    // Upload resume attachment
    const resumePath = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';
    console.log('Uploading attachment:', resumePath);

    const fileInput = await page.$('input[type="file"][name="Filedata"], input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('File selected. Waiting 6s for upload completion...');
      await sleep(6000);
    } else {
      console.error('File input not found!');
    }

    // Verify attachment element or filename in DOM
    const attached = await page.evaluate(() => {
      return document.body.innerText.includes('Pratik Patidar Resume - MERN Full Stack.pdf');
    });
    console.log('Attachment upload status:', attached ? 'SUCCESSFULLY ATTACHED ✅' : 'NOT CONFIRMED');

    // Send email using Ctrl+Enter
    console.log('Sending email via Ctrl+Enter...');
    await page.focus('div[aria-label="Message Body"]');
    await sleep(500);
    await page.keyboard.down('Control');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Control');

    console.log('Ctrl+Enter triggered. Waiting 5s for delivery confirmation...');
    await sleep(5000);

    // Check if compose box closed / "Message sent" toast appears
    const result = await page.evaluate(() => {
      const toast = document.querySelector('span.bAq, div.bA8');
      const toastText = toast ? toast.innerText : '';
      const stillOpen = !!document.querySelector('div[aria-label="Message Body"]');
      return { toastText, stillOpen };
    });

    console.log('Delivery Result:', JSON.stringify(result, null, 2));
    if (!result.stillOpen || result.toastText.includes('sent')) {
      console.log('🎉 EMAIL CONFIRMED SENT TO SHWETA BHARTI!');
    } else {
      // Fallback: click explicit Send button
      console.log('Trying manual Send button click...');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('div[role="button"]'));
        const sendBtn = btns.find(b => b.innerText.trim() === 'Send' || b.getAttribute('aria-label')?.startsWith('Send'));
        if (sendBtn) sendBtn.click();
      });
      await sleep(4000);
      console.log('Fallback Send executed.');
    }

  } catch (err) {
    console.error('Error during execution:', err.message);
  } finally {
    if (browser) await browser.disconnect();
  }
})();
