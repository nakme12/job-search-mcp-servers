const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/9F9016A36E57A6A9C58587FD8906B212');

ws.on('open', () => {
  // Focus, change value via property descriptor, and dispatch events
  const code = `(() => {
    const el = document.getElementById('Line10ClaimArticleandParagraph');
    if (!el) return { error: 'not found' };
    
    el.focus();
    // Use native input value setter
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(el, '15');
    
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();

    const hdnArt = document.getElementById('hdnLine10ClaimArticleandParagraph');
    if (hdnArt) hdnArt.value = '15';

    // Type of income
    const typeSelect = document.getElementById('Line10TypeOfIncomeId');
    if (typeSelect) {
      typeSelect.value = '12';
      typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return {
      elVal: el.value,
      typeSelectVal: typeSelect ? typeSelect.value : null
    };
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  console.log('Result:', JSON.parse(msg).result.result.value);
  ws.close();
  process.exit(0);
});
