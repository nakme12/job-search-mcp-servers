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

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  // Verify header
  const header = await wa.evaluate(() => document.querySelector('#main header')?.innerText?.replace(/\n+/g, ' '));
  console.log('Confirmed Active Chat Header:', header);
  if (!header || !header.toLowerCase().includes('aman')) {
    console.error('Not Aman Techstuff chat!');
    await browser.disconnect();
    return;
  }

  // Look for any open preview or modal and close it first by pressing Escape
  await wa.keyboard.press('Escape');
  await sleep(1000);

  // Function to send a resume
  async function sendFile(filePath, label) {
    console.log(`\n--- Starting send for: ${label} ---`);
    const fileInputs = await wa.$$('input[type="file"]');
    // find the input with accept="*"
    let docInput = null;
    for (const inp of fileInputs) {
      const accept = await inp.evaluate(el => el.getAttribute('accept'));
      if (accept === '*' || !accept.includes('image')) {
        docInput = inp;
        break;
      }
    }

    if (!docInput) {
      console.error('Could not find docInput with accept="*"');
      return false;
    }

    console.log(`Uploading ${label} to input[type="file"]...`);
    await docInput.uploadFile(filePath);
    console.log('File set. Waiting 3.5s for document preview modal...');
    await sleep(3500);

    // Take preview screenshot
    await wa.screenshot({ path: `screenshots/2026-10-12/preview_${label.replace(/\s+/g, '_')}.png` });

    // Look for send button or press Enter
    // In WA document preview, the send button is usually span[data-icon="send"]
    console.log('Locating send button in preview...');
    const clicked = await wa.evaluate(() => {
      // Look for send icon
      const sendIcon = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]');
      if (sendIcon) {
        const btn = sendIcon.closest('button, div[role="button"]');
        if (btn) {
          btn.click();
          return 'clicked_icon';
        }
      }
      // Check aria-label="Send"
      const ariaSend = document.querySelector('[aria-label="Send"], [data-testid="send"]');
      if (ariaSend) {
        ariaSend.click();
        return 'clicked_aria';
      }
      return 'not_found';
    });

    console.log('Click send result:', clicked);
    if (clicked === 'not_found') {
      console.log('Attempting keyboard Enter...');
      await wa.keyboard.press('Enter');
    }

    console.log('Waiting 5s for delivery into chat...');
    await sleep(5000);
    return true;
  }

  // Send Frontend Resume
  await sendFile(feResume, 'Frontend Engineer Resume');

  await sleep(2000);

  // Send MERN Resume
  await sendFile(mernResume, 'MERN Full Stack Resume');

  await sleep(3000);

  // Save final chat screenshot proof
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_final_success.png' });
  console.log('\nFinal confirmation screenshot saved to screenshots/2026-10-12/wa_aman_final_success.png');

  await browser.disconnect();
}

main().catch(console.error);
