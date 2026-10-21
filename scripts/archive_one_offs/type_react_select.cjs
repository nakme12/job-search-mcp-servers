const puppeteer = require('puppeteer-core');

async function selectReactDropdowns() {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('headoutcareers'));
  if (!page) {
    console.log('page not found');
    process.exit(1);
  }

  // Exact target input IDs
  const targetInputs = [
    { id: 'country', text: 'India' },
    { id: 'question_8705238006', text: '1-2' },
    { id: 'question_8647640006', text: '1-2' },
    { id: 'question_8647641006', text: 'Yes' },
    { id: 'question_8687533006', text: '2.16' },
    { id: 'question_8647646006', text: '15' },
    { id: 'question_8647647006', text: 'Yes' }
  ];

  for (const item of targetInputs) {
    console.log(`\nFocusing and typing in input #${item.id} -> "${item.text}"`);

    const inputHandle = await page.$(`#${item.id}`);
    if (inputHandle) {
      await inputHandle.focus();
      await new Promise(r => setTimeout(r, 200));

      // Type the query
      await page.keyboard.type(item.text, { delay: 100 });
      await new Promise(r => setTimeout(r, 600));

      // Press Enter to commit option
      await page.keyboard.press('Enter');
      await new Promise(r => setTimeout(r, 400));
      console.log(`Selected option for #${item.id}`);
    } else {
      console.log(`Could not find #${item.id}`);
    }
  }

  // Check remaining invalid inputs
  const invalids = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input.remix-css-1a0ro4n-requiredInput')).filter(i => !i.value).length;
  });

  console.log(`\nRemaining empty required dropdowns: ${invalids}`);
  process.exit(0);
}

selectReactDropdowns().catch(err => {
  console.error(err);
  process.exit(1);
});
