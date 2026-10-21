import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const preview = await wa.evaluate(() => {
    // Check if preview overlay or dialog exists
    const allDivs = Array.from(document.querySelectorAll('div'));
    const candidate = allDivs.find(d => d.innerText && d.innerText.includes('Pratik Patidar Resume'));
    return {
      found: !!candidate,
      text: candidate ? candidate.innerText.substring(0, 300) : null
    };
  });

  console.log('Preview overlay status:', preview);
  await browser.disconnect();
}

main().catch(console.error);
