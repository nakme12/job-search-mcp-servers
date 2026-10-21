import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  console.log("Navigating to Adzuna page...");
  await page.goto('https://www.adzuna.in/details/5916910289?utm_medium=api&utm_source=22d4b243', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Dismiss modal if present
  await page.evaluate(() => {
    const noThanks = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText.includes('No, thanks'));
    if (noThanks) noThanks.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const targetHref = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/land/ad/"]');
    return link ? link.href : null;
  });

  console.log("Adzuna redirect link:", targetHref);

  if (targetHref) {
    console.log("Navigating to actual employer/landing page...");
    await page.goto(targetHref, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    console.log("Final landing URL:", page.url());
    const text = await page.evaluate(() => document.body.innerText);
    const dateMatch = text.match(/posted\s*([^\n]+)/i);
    console.log("Landing page posted date:", dateMatch ? dateMatch[0] : 'None');
    console.log("Snippet:", text.slice(0, 300).replace(/\n+/g, ' | '));
  }

  await page.close();
  await browser.disconnect();
}

main();
