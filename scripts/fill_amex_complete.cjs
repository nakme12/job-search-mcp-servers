const puppeteer = require('puppeteer-core');
const path = require('path');

async function fillAmEx() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const amex = pages.find(p => p.url().includes('oraclecloud.com'));
  if (!amex) {
    console.log('AmEx tab not found');
    return;
  }

  console.log('--- 1. Uploading Resume ---');
  const resumePath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
  const fileInputs = await amex.$$('input[type="file"]');
  console.log(`Found ${fileInputs.length} file inputs.`);
  if (fileInputs.length > 0) {
    // Inject file into first or second file input
    await fileInputs[0].uploadFile(resumePath);
    console.log('Resume injected into file input 0');
    if (fileInputs.length > 1) {
      await fileInputs[1].uploadFile(resumePath);
      console.log('Resume injected into file input 1');
    }
  }

  console.log('--- 2. Filling Contact Information ---');
  await amex.evaluate(() => {
    function setVal(selector, val) {
      const el = document.querySelector(selector);
      if (el) {
        el.value = '';
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // Title: Mr.
    const mrBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Mr.');
    if (mrBtn) mrBtn.click();

    // First & Last Name
    setVal('input[name="firstName"]', 'Pratik');
    setVal('input[name="lastName"]', 'Patidar');

    // Phone Number
    const phoneInput = document.querySelector('input[type="tel"]') || document.querySelector('input[aria-label="Phone Number"]');
    if (phoneInput) {
      phoneInput.value = '';
      phoneInput.value = '8269647990';
      phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Address
    setVal('input[name="addressLine1"]', 'Indore, MP');
    setVal('input[name="city"]', 'Indore');
    setVal('input[name="postalCode"]', '452001');

    // Portfolio link
    const linkInput = document.querySelector('input[name="siteLink-1"]');
    if (linkInput) {
      linkInput.value = 'https://pratik-portfolio-nine-orcin.vercel.app';
      linkInput.dispatchEvent(new Event('input', { bubbles: true }));
      linkInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  console.log('--- 3. Checking Standard Screening Questions ---');
  const radioIdsToSelect = [
    '300001061256599-9-300001061256601', // Q3: No
    '300001061256468-10-300001061256473', // Q4: No
    '300001061256382-11-300001061256390', // Q5: No
    '300001061256373-12-300001061256381', // Q6: No
    '300001061256367-13-300001061256369', // Q7: No
    '300001061256347-14-300001061256358', // Q8: No
    '300001061256344-15-300001061256346', // Q9: No
    '300001061256335-16-300001061256337', // Q10: No
    '300001061256332-17-300001061256333', // Q11: No
    '300001061256323-18-300001061256328', // Q12: No
    '300001061256314-19-300001061256322', // Q13: No
    '300001061256305-20-300001061256313', // Q14: No
    '300001061256252-21-300001061256254', // Q15: No
    '300001061213873-22-300001061213875', // Q16: No (sponsorship)
    '300001061213865-23-300001061213867', // Q17: Yes (authorized in India)
    '300001061213857-24-300001061213859', // Q18: Yes (proof of age)
    '300001061213849-25-300001061213850', // Q19: Yes (12th certificate)
    '300001061213839-26-300001061213840', // Q20: Yes (passport India)
    '300001061213746-27-300001061213754', // Q21: Not applicable
    '300001061213738-28-300001061213743', // Q22: Yes (Citizen of India)
    '300001061213730-29-300001061213731', // Q23: No (specific tech)
    '300001061213722-30-300001061213727', // Q24: No (specific interview tech)
    '300001061213712-31-300001061213718'  // Q25: No (disability)
  ];

  await amex.evaluate((ids) => {
    ids.forEach(id => {
      const radio = document.getElementById(id);
      if (radio) {
        radio.click();
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }, radioIdsToSelect);

  console.log('All screening radio buttons clicked successfully.');
  console.log('AmEx Section 1 populated completely!');
}

fillAmEx().catch(console.error);
