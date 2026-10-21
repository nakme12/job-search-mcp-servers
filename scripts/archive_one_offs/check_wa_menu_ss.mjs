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

  // Trigger attach
  console.log('Clicking attach plus icon...');
  const plusBtn = await wa.$('span[data-icon="plus"]');
  if (plusBtn) await plusBtn.click();
  await sleep(1500);

  // Take screenshot of open attach menu
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_attach_menu.png' });

  // Look for the input element that is specifically inside or created by the menu
  const inputsBefore = await wa.evaluate(() => {
    return Array.from(document.querySelectorAll('input[type="file"]')).map(i => ({ accept: i.accept, id: i.id, style: i.getAttribute('style') }));
  });
  console.log('Inputs after clicking plus:', inputsBefore);

  await browser.disconnect();
}

main().catch(console.error);
