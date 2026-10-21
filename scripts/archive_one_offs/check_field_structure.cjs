const puppeteer = require('puppeteer-core');

async function checkSampleField() {
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

  const fieldData = await page.evaluate(() => {
    // Look for all questions
    const inputs = Array.from(document.querySelectorAll('input.remix-css-1a0ro4n-requiredInput'));
    return inputs.map(inp => {
      let curr = inp;
      while (curr && !curr.innerText.includes('*') && curr !== document.body) {
        curr = curr.parentElement;
      }
      return {
        labelText: curr?.innerText?.split('\n')?.[0],
        html: curr ? curr.outerHTML.slice(0, 600) : 'none'
      };
    });
  });

  console.log('Field Structures:\n', JSON.stringify(fieldData, null, 2));
  process.exit(0);
}

checkSampleField().catch(err => {
  console.error(err);
  process.exit(1);
});
