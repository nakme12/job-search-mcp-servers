import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  // Coordinates of the paperclip icon in footer (x: ~367, y: ~947)
  const clipCoords = await wa.evaluate(() => {
    const clip = document.querySelector('button[title="Attach"], span[data-icon="plus"], div[aria-label="Attach"]') || document.querySelector('footer button');
    if (clip) {
      const r = clip.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    // Fallback based on footer
    const footer = document.querySelector('footer');
    const fr = footer.getBoundingClientRect();
    return { x: fr.x + 35, y: fr.y + fr.height / 2 };
  });

  console.log('Clicking paperclip icon at:', clipCoords);
  await wa.mouse.click(clipCoords.x, clipCoords.y);
  await sleep(1500);

  // Take screenshot to see open popup
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_paperclip_popup.png' });

  // Get popup items
  const menuInfo = await wa.evaluate(() => {
    const list = Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"]')).map(el => {
      const r = el.getBoundingClientRect();
      return { text: el.innerText.trim(), x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
    }).filter(i => i.text.length > 0 && i.text.length < 30);
    return list;
  });
  console.log('Menu items detected:', menuInfo);

  // Look for Document item
  const docItem = menuInfo.find(m => m.text.toLowerCase().includes('document'));
  if (docItem) {
    console.log('Clicking Document item at:', docItem);
    await wa.mouse.click(docItem.x, docItem.y);
    await sleep(2000);
  }

  // Upload FE Resume
  const inputs = await wa.$$('input[type="file"]');
  console.log('File inputs present:', inputs.length);
  const targetInput = inputs[inputs.length - 1];
  if (targetInput) {
    await targetInput.uploadFile(feResume);
    await sleep(4000);

    // Click green circular send button
    const greenBtn = await wa.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div[role="button"], span[data-icon="send"]'));
      for (const d of allDivs) {
        if (d.getAttribute('aria-label') === 'Send' || d.getAttribute('data-icon') === 'send') {
          const r = d.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }
      }
      return { x: window.innerWidth - 60, y: window.innerHeight - 60 };
    });
    console.log('Clicking green send button at:', greenBtn);
    await wa.mouse.click(greenBtn.x, greenBtn.y);
    await sleep(5000);
  }

  // Send MERN Resume
  await wa.mouse.click(clipCoords.x, clipCoords.y);
  await sleep(1500);

  if (docItem) {
    await wa.mouse.click(docItem.x, docItem.y);
    await sleep(2000);
  }

  const inputs2 = await wa.$$('input[type="file"]');
  const targetInput2 = inputs2[inputs2.length - 1];
  if (targetInput2) {
    await targetInput2.uploadFile(mernResume);
    await sleep(4000);

    const greenBtn2 = await wa.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div[role="button"], span[data-icon="send"]'));
      for (const d of allDivs) {
        if (d.getAttribute('aria-label') === 'Send' || d.getAttribute('data-icon') === 'send') {
          const r = d.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }
      }
      return { x: window.innerWidth - 60, y: window.innerHeight - 60 };
    });
    await wa.mouse.click(greenBtn2.x, greenBtn2.y);
    await sleep(5000);
  }

  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_proof_real_delivery.png' });
  console.log('Final screenshot saved to screenshots/2026-10-12/wa_proof_real_delivery.png');

  await browser.disconnect();
}

main().catch(console.error);
