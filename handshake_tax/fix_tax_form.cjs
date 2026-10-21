const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/9F9016A36E57A6A9C58587FD8906B212');

ws.on('open', () => {
  const code = `(() => {
    // 1. Correct Line 9 Country to India (427)
    const line9 = document.getElementById('Line9ResidentCountryId');
    if (line9) {
      line9.value = '427';
      line9.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 2. Set Line 10 Article
    const art = document.getElementById('Line10ClaimArticleandParagraph');
    if (art) {
      art.value = '15';
      art.dispatchEvent(new Event('input', { bubbles: true }));
      art.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 3. Set Line 10 Type of Income to Independent Personal Services (12)
    const typeSelect = document.getElementById('Line10TypeOfIncomeId');
    if (typeSelect) {
      typeSelect.value = '12';
      typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 4. Set Line 10 Withholding Rate to 0.00
    const rate = document.getElementById('Line10WithholdingRate');
    if (rate) {
      rate.value = '0.00';
      rate.dispatchEvent(new Event('input', { bubbles: true }));
      rate.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return {
      line9Val: line9 ? line9.value : null,
      line9Text: line9 ? line9.selectedOptions[0]?.text : null,
      artVal: art ? art.value : null,
      typeVal: typeSelect ? typeSelect.value : null,
      typeText: typeSelect ? typeSelect.selectedOptions[0]?.text : null,
      rateVal: rate ? rate.value : null
    };
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  console.log('Result:', JSON.parse(msg).result.result.value);
  ws.close();
  process.exit(0);
});
