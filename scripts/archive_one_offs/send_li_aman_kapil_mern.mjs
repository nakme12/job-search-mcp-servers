import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

async function sendResumeToAman() {
  const resumePath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
  if (!fs.existsSync(resumePath)) {
    console.error('MERN Resume does not exist:', resumePath);
    return;
  }
  console.log('MERN Resume found:', resumePath);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Find conversation item for Aman Kapil and click
    const clicked = await page.evaluate(() => {
      const convCards = Array.from(document.querySelectorAll('.msg-conversation-listitem, .msg-conversation-card'));
      for (const card of convCards) {
        const nameEl = card.querySelector('.msg-conversation-listitem__participant-names, .msg-conversation-card__participant-names');
        if (nameEl && nameEl.innerText.includes('Aman Kapil')) {
          card.click();
          return true;
        }
      }
      return false;
    });

    if (!clicked) {
      console.log('Could not find Aman Kapil card to click.');
      return;
    }
    console.log('Clicked Aman Kapil conversation.');
    await new Promise(r => setTimeout(r, 3000));

    // Header Assertion (Rule 16)
    const headerName = await page.evaluate(() => {
      const titleEl = document.querySelector('.msg-title-bar__title, .msg-entity-lockup__entity-title, .msg-thread__link-to-profile');
      return titleEl ? titleEl.innerText.trim() : '';
    });
    console.log('Active Chat Header Name:', headerName);

    if (!headerName.includes('Aman Kapil')) {
      console.error('HEADER MISMATCH! Expected Aman Kapil, got:', headerName);
      return;
    }
    console.log('✓ Header verified 100%: Aman Kapil');

    // Attach file input
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      console.error('File input not found in chat DOM!');
      return;
    }

    console.log('Uploading MERN resume...');
    await fileInput.uploadFile(resumePath);
    await new Promise(r => setTimeout(r, 5000));

    // Make sure text editor is completely empty (WITHOUT NOTE)
    await page.evaluate(() => {
      const editor = document.querySelector('.msg-form__contenteditable[contenteditable="true"]');
      if (editor) {
        editor.innerText = '';
        editor.innerHTML = '<p><br></p>';
      }
    });

    // Check if send button is enabled or submit
    console.log('Triggering Send...');
    const sent = await page.evaluate(() => {
      const sendBtn = document.querySelector('button.msg-form__send-button, button[type="submit"].msg-form__send-button');
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
        return true;
      }
      return false;
    });

    if (!sent) {
      console.log('Send button disabled or not clicked, focusing editor and sending via Enter...');
      const editor = await page.$('.msg-form__contenteditable[contenteditable="true"]');
      if (editor) {
        await editor.focus();
        await page.keyboard.press('Enter');
      }
    }

    await new Promise(r => setTimeout(r, 6000));

    // Proof screenshot
    const proofDir = path.resolve('screenshots/2026-10-12');
    if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });
    const proofPath = path.join(proofDir, 'li_aman_kapil_mern_resume_sent.png');
    await page.screenshot({ path: proofPath });
    console.log('✓ Saved delivery proof screenshot to:', proofPath);

  } catch (err) {
    console.error('Error sending resume:', err.message);
  } finally {
    await page.close();
  }
}

sendResumeToAman();
