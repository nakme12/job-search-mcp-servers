const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const infy = pages.find(p => p.url().includes('career.infosys.com/jobs/jobapply'));

  if (!infy) {
    console.log('No Infosys apply page found');
    return;
  }

  const formData = await infy.evaluate(() => {
    // Find all form fields
    const fields = Array.from(document.querySelectorAll('mat-form-field, .form-group, .row > div, input, select, textarea')).map(el => {
      const label = el.querySelector('label, mat-label')?.innerText?.trim() || el.getAttribute('placeholder') || '';
      const input = el.querySelector('input, select, textarea') || (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) ? el : null);
      const isRequired = el.innerText.includes('*') || input?.required || el.querySelector('.required, [aria-required="true"]') !== null;
      const val = input ? input.value : '';
      const err = el.querySelector('.mat-error, .error, .text-danger')?.innerText?.trim() || '';
      return {
        label,
        tag: input?.tagName || el.tagName,
        type: input?.type || '',
        value: val,
        isRequired,
        error: err
      };
    }).filter(f => f.label || f.error);

    // Look for all red error texts on the page
    const allErrors = Array.from(document.querySelectorAll('.mat-error, .text-danger, [class*="error"], .ng-invalid')).map(e => e.innerText?.trim()).filter(Boolean);

    // Look for dropdown options
    const dropdowns = Array.from(document.querySelectorAll('mat-select, select')).map(s => ({
      id: s.id,
      name: s.getAttribute('name') || s.getAttribute('formcontrolname'),
      placeholder: s.getAttribute('placeholder') || s.innerText.trim().substring(0, 30),
      label: s.closest('mat-form-field')?.querySelector('label, mat-label')?.innerText?.trim() || ''
    }));

    return {
      fields: fields.slice(0, 25),
      errors: Array.from(new Set(allErrors)).slice(0, 10),
      dropdowns
    };
  });

  console.log(JSON.stringify(formData, null, 2));
  await b.disconnect();
})();
