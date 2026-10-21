const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const oneformaPage = pages.find(p => p.url().includes('my.oneforma.com/contributor/surveys'));
    if (!oneformaPage) {
      console.log('Oneforma survey page not found!');
      process.exit(1);
    }
    const frame = oneformaPage.frames().find(f => f.url().includes('aidaform.com'));
    if (!frame) {
      console.log('Aidaform frame not found!');
      process.exit(1);
    }

    const data = await frame.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select, canvas, button'));
      return inputs.map(el => {
        const id = el.id || '';
        const name = el.name || '';
        const type = el.type || '';
        const value = el.value || '';
        const placeholder = el.placeholder || '';
        
        let labelText = '';
        if (id) {
          const lbl = document.querySelector(`label[for="${id}"]`);
          if (lbl) labelText = lbl.innerText.trim();
        }
        if (!labelText && el.parentElement) {
          labelText = el.parentElement.innerText.trim();
        }

        // Parent container text
        let curr = el.parentElement;
        let containerText = '';
        for (let i = 0; i < 6 && curr; i++) {
          if (curr.innerText && curr.innerText.length > labelText.length) {
            containerText = curr.innerText.trim();
            break;
          }
          curr = curr.parentElement;
        }

        return {
          tag: el.tagName,
          id,
          name,
          type,
          value,
          placeholder,
          labelText,
          containerSnippet: containerText.split('\n').slice(0, 5).join(' || ')
        };
      });
    });

    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
