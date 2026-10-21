const puppeteer = require('puppeteer-core');

// Tabs to KEEP (Gmail primary, LinkedIn, Telegram)
const KEEP_URLS = [
  'mail.google.com/mail/u/0',
  'linkedin.com',
  'web.telegram.org'
];

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();

  console.log(`Total tabs open: ${pages.length}`);
  console.log('');

  // Track which Gmail tab to keep (first one only)
  let gmailKept = false;
  let liKept = false;
  let tgKept = false;

  for (const page of pages) {
    const url = page.url();
    const title = await page.title().catch(() => url);

    const isGmail = url.includes('mail.google.com/mail/u/0');
    const isLinkedIn = url.includes('linkedin.com');
    const isTelegram = url.includes('web.telegram.org');

    let shouldKeep = false;

    if (isGmail && !gmailKept) { shouldKeep = true; gmailKept = true; }
    else if (isLinkedIn && !liKept) { shouldKeep = true; liKept = true; }
    else if (isTelegram && !tgKept) { shouldKeep = true; tgKept = true; }

    if (shouldKeep) {
      console.log(`✅ KEEPING: ${title.substring(0, 60)}`);
    } else {
      console.log(`🗑️  CLOSING: ${title.substring(0, 60)}`);
      try {
        await page.close();
      } catch(e) {
        console.log(`   (could not close: ${e.message})`);
      }
    }
  }

  const remaining = await browser.pages();
  console.log(`\n✅ Done! ${remaining.length} tab(s) remaining.`);
  await browser.disconnect();
})().catch(e => console.error('ERROR:', e.message));
