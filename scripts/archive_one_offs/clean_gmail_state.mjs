import puppeteer from 'puppeteer-core';

async function dismissFeedbackAndCleanGmail() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const gmailPage = pages.find(p => p.url().includes('mail.google.com'));
  if (!gmailPage) return;
  await gmailPage.bringToFront();

  // Reload page to clear any stuck popups or open compose windows
  await gmailPage.reload({ waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 5000));
  await gmailPage.screenshot({ path: 'screenshots/2026-10-12/gmail_reloaded_clean.png' });
  console.log('Gmail reloaded clean and ready.');
}

dismissFeedbackAndCleanGmail().catch(console.error);
