const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const oneformaPage = pages.find(p => p.url().includes('my.oneforma.com/contributor/surveys'));
    const frame = oneformaPage.frames().find(f => f.url().includes('aidaform.com'));

    const res = await frame.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, canvas, button'));
      return inputs.map(el => {
        let parent = el;
        // find a container that has text distinct from just the element
        for (let i = 0; i < 4; i++) {
          if (parent.parentElement) parent = parent.parentElement;
        }
        return {
          id: el.id,
          name: el.name,
          type: el.type,
          tag: el.tagName,
          value: el.value,
          checked: el.checked,
          classes: el.className,
          parentText: parent ? parent.innerText : ''
        };
      });
    });

    for (let i = 0; i < res.length; i++) {
      console.log(`[${i}] ${res[i].tag} id=${res[i].id} name=${res[i].name} type=${res[i].type} value=${res[i].value}`);
      console.log(`    Context: ${res[i].parentText.replace(/\n+/g, ' | ')}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
