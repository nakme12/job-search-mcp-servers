const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const oneformaPage = pages.find(p => p.url().includes('my.oneforma.com/contributor/surveys'));
    const frame = oneformaPage.frames().find(f => f.url().includes('aidaform.com'));

    const structure = await frame.evaluate(() => {
      // Find all sections / fields
      const elements = Array.from(document.querySelectorAll('.af-element, [id^="field-"]'));
      // Let's inspect each question container specifically
      const questions = [];
      const form = document.querySelector('form') || document.body;
      
      return {
        formAction: form.action || '',
        formMethod: form.method || '',
        hiddenInputs: Array.from(document.querySelectorAll('input[type="hidden"]')).map(i => ({ name: i.name, value: i.value })),
        allInputsGrouped: Array.from(document.querySelectorAll('.af-element')).map(el => ({
          text: el.innerText.trim(),
          inputNames: Array.from(el.querySelectorAll('input, textarea, select, canvas, button')).map(inp => ({
            tag: inp.tagName,
            type: inp.type,
            name: inp.name,
            id: inp.id,
            value: inp.value,
            checked: inp.checked
          }))
        })).filter(x => x.text.length > 0)
      };
    });

    console.log(JSON.stringify(structure, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
