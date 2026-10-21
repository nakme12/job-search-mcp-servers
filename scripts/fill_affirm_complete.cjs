const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('affirm'));
  if (!page) {
    console.log('Affirm tab not found');
    browser.disconnect();
    return;
  }

  // Type a text input cleanly
  async function typeField(selector, text) {
    const el = await page.$(selector);
    if (el) {
      await el.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await el.type(text, { delay: 60 });
      console.log(`Typed in ${selector}: ${text}`);
    }
  }

  console.log('--- 1. Typing Personal Details ---');
  await typeField('#first_name', 'Pratik');
  await typeField('#last_name', 'Patidar');
  await typeField('#email', 'pratikpatidar7990@gmail.com');
  await typeField('#phone', '8269647990');
  await typeField('#candidate-location', 'Indore, India');

  console.log('--- 2. Uploading Resume ---');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile('C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - React Developer.pdf');
    console.log('Resume uploaded.');
  }

  console.log('--- 3. Typing Education Details ---');
  await typeField('#school--0', 'Barkatullah University Institute of Technology');
  await typeField('#degree--0', 'Bachelor of Technology');
  await typeField('#discipline--0', 'Computer Science and Engineering');
  await typeField('#start-month--0', '08');
  await typeField('#start-year--0', '2020');
  await typeField('#end-month--0', '06');
  await typeField('#end-year--0', '2024');

  console.log('--- 4. Custom Affirm Questions ---');
  await typeField('#question_32942345003', 'Pratik'); // Preferred Name
  await typeField('#question_32942347003', 'He/Him');  // Pronouns

  // Fill dropdowns/inputs
  await page.evaluate(() => {
    function setSelectByText(selector, textMatch) {
      const el = document.querySelector(selector);
      if (el && el.tagName === 'SELECT') {
        const opt = Array.from(el.options).find(o => o.text.toLowerCase().includes(textMatch.toLowerCase()));
        if (opt) {
          el.value = opt.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }

    // Sponsorship questions
    setSelectByText('#question_32942348003', 'yes');
    setSelectByText('#question_32942349003', 'yes');
    
    // State / Province (Outside US)
    setSelectByText('#question_32942350003', 'not applicable');
    setSelectByText('#question_32942350003', 'outside');
    setSelectByText('#question_32942350003', 'other');

    // Learn about Affirm
    setSelectByText('#question_32942351003', 'linkedin');

    // Previously employed
    setSelectByText('#question_32942356003', 'no');
  });

  console.log('Form fully populated! Check live tab.');
  browser.disconnect();
})();
