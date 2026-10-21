import puppeteer from 'puppeteer';

const channelsToJoin = [
  'merntech',
  'remote_frontend_jobs',
  'placementlelo',
  'developerjobs',
  'freshershunt',
  'offcampusjobs4u',
  'freshersvoice',
  'fullstackjobs',
  'coding_jobs',
  'software_engineering_jobs',
  'web_development_jobs',
  'hire_developers',
  'techjobsalert',
  'react_india',
  'placement_drive'
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tgPage = pages.find(p => p.url().includes('web.telegram.org'));
  if (!tgPage) {
    console.error("No Telegram Web tab found!");
    process.exit(1);
  }

  console.log("Connected to logged-in Telegram Web session!");

  for (const ch of channelsToJoin) {
    console.log(`\nNavigating to join channel: @${ch}...`);
    await tgPage.goto(`https://web.telegram.org/k/#@${ch}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    const result = await tgPage.evaluate(() => {
      // Look for JOIN button in Telegram Web (K version)
      const buttons = Array.from(document.querySelectorAll('button, div.join-button, .chat-join-button, .btn-primary'));
      const joinBtn = buttons.find(b => b.innerText && /join|subscribe/i.test(b.innerText.trim()));
      if (joinBtn) {
        joinBtn.click();
        return 'CLICKED_JOIN';
      }
      return 'ALREADY_JOINED_OR_NO_BTN';
    });

    console.log(`Channel @${ch} status: ${result}`);
    await sleep(2000);
  }

  console.log("\nFinished joining tech hiring channels in Telegram Web!");
  await browser.disconnect();
}

main().catch(console.error);
