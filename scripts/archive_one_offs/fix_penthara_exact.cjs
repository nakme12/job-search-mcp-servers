const puppeteer = require('puppeteer-core');

async function fixAllPentharaErrors() {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('zohorecruit.com'));
  if (!page) {
    console.log('page not found');
    process.exit(1);
  }

  console.log('Directly fixing all validation errors on Penthara Zoho Recruit...');

  await page.evaluate(() => {
    function setByExactName(name, val) {
      const el = document.querySelector(`[name="${name}"]`);
      if (el) {
        el.focus();
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }

    // 1. All Question Textareas by exact field name
    setByExactName('rec-form_754264000003463045', 'Building high-performance scalable web applications and growing into a core frontend engineering specialist.');
    setByExactName('rec-form_754264000003463057', 'Class 10th: 90%, Class 12th: 79.6%');
    setByExactName('rec-form_754264000003463069', 'I am passionate about modern React ecosystem and cloud-integrated web apps. Penthara’s culture of innovation and impactful client solutions aligns perfectly with my background.');
    setByExactName('rec-form_754264000003497034', '2 Years');
    setByExactName('rec-form_754264000003497038', '15 Days');
    setByExactName('rec-form_754264000003463073', 'The focus on cutting-edge Azure/M365 cloud ecosystems, engineering excellence, and transparent culture.');
    setByExactName('rec-form_754264000003463077', '4.65 LPA (Negotiable as per company standards)');
    setByExactName('rec-form_754264000003463081', 'Honesty, engineering integrity, and consistent accountability.');
    setByExactName('rec-form_754264000003463085', 'Solving real-world user problems through clean, fast code and learning from world-class tech builders.');

    // 2. Terms of Application Checkbox
    const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    checkboxes.forEach(cb => {
      if (!cb.checked) {
        cb.click();
        cb.checked = true;
      }
    });
  });

  console.log('Filled all 9 question textareas and accepted terms checkbox.');

  // Check remaining errors
  const errors = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.cw-field-error, .text-danger, span[style*="color: red"]')).map(e => e.innerText.trim()).filter(Boolean);
  });

  console.log('Remaining error messages:\n', errors);
  process.exit(0);
}

fixAllPentharaErrors().catch(err => {
  console.error(err);
  process.exit(1);
});
