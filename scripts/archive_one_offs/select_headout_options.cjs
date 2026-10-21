const puppeteer = require('puppeteer-core');

async function selectAllHeadoutOptions() {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('headoutcareers'));
  if (!page) {
    console.log('Headout page not found');
    process.exit(1);
  }

  console.log('Automating mouse clicks on all 8 custom React-Select dropdowns...');

  const dropdowns = [
    { name: 'Country', optionMatch: 'India' },
    { name: 'How much of your production', optionMatch: '1-2' },
    { name: 'How many years of full-time', optionMatch: '1-2' },
    { name: 'willing to relocate', optionMatch: 'Yes' },
    { name: 'interviewed for this role', optionMatch: 'No' },
    { name: 'current compensation', optionMatch: '2.16' },
    { name: 'notice period', optionMatch: '15' },
    { name: 'confirm that all the information', optionMatch: 'Yes' }
  ];

  for (const dd of dropdowns) {
    console.log(`\nClicking dropdown: "${dd.name}"...`);

    // Find the select indicator / control element
    const rect = await page.evaluate((targetName) => {
      const labels = Array.from(document.querySelectorAll('label, .field'));
      const targetLabel = labels.find(l => (l.innerText || '').toLowerCase().includes(targetName.toLowerCase()));
      if (!targetLabel) return null;

      const control = targetLabel.closest('.field')?.querySelector('[class*="control"]') || 
                      targetLabel.parentElement?.querySelector('[class*="control"]');
      if (!control) return null;

      control.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const b = control.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    }, dd.name);

    if (!rect) {
      console.log(`Control not found for ${dd.name}`);
      continue;
    }

    await new Promise(r => setTimeout(r, 600));
    await page.mouse.click(rect.x, rect.y);
    console.log(`Clicked control for ${dd.name} at (${rect.x}, ${rect.y}). Waiting for menu...`);
    await new Promise(r => setTimeout(r, 800));

    // Inspect menu options and click the matching one
    const optionRect = await page.evaluate((matchStr) => {
      const options = Array.from(document.querySelectorAll('[class*="option"], div[role="option"]'));
      console.log('Visible options:', options.map(o => o.innerText));
      const match = options.find(o => o.innerText.toLowerCase().includes(matchStr.toLowerCase())) || options[0];
      if (match) {
        match.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const b = match.getBoundingClientRect();
        return { text: match.innerText, x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }
      return null;
    }, dd.optionMatch);

    if (optionRect) {
      console.log(`Found option "${optionRect.text}". Clicking...`);
      await page.mouse.click(optionRect.x, optionRect.y);
      await new Promise(r => setTimeout(r, 600));
    } else {
      console.log(`No option matched for query "${dd.optionMatch}"`);
    }
  }

  // Check how many invalid inputs remain
  const remainingInvalid = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input:invalid')).length;
  });

  console.log(`\nRemaining invalid inputs count: ${remainingInvalid}`);
  process.exit(0);
}

selectAllHeadoutOptions().catch(err => {
  console.error(err);
  process.exit(1);
});
