import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const p = pages.find(x => x.url().includes('career.infosys.com'));
  if (!p) {
    console.log('No Infosys page found');
    await browser.disconnect();
    return;
  }

  const inputsLabels = await p.evaluate(() => {
    return Array.from(document.querySelectorAll('mat-form-field, .mat-mdc-form-field')).map(f => {
      const label = f.querySelector('mat-label, label')?.innerText;
      const input = f.querySelector('input');
      return {
        label: label ? label.trim() : null,
        inputId: input ? input.id : null,
        inputName: input ? input.name : null,
        value: input ? input.value : null
      };
    });
  });

  console.log('Infosys form field labels:', JSON.stringify(inputsLabels, null, 2));
  await browser.disconnect();
})();
