const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/9F9016A36E57A6A9C58587FD8906B212');

ws.on('open', () => {
  const code = `(() => {
    const select = document.getElementById('Line10TypeOfIncomeId');
    if (select) {
      select.value = '12';
      if (typeof window.SetTreatyValuesByTreatyId === 'function') {
        window.SetTreatyValuesByTreatyId('12');
      }
      if (typeof $ !== 'undefined' && $('#Line10TypeOfIncomeId').valid) {
        $('#Line10TypeOfIncomeId').valid();
      }
      const err = document.getElementById('Line10TypeOfIncomeId-error');
      if (err) err.style.display = 'none';
      select.classList.remove('error');
      select.setAttribute('aria-invalid', 'false');
    }

    const art = document.getElementById('Line10ClaimArticleandParagraph');
    if (art) {
      art.value = '15';
      const hdnArt = document.getElementById('hdnLine10ClaimArticleandParagraph');
      if (hdnArt) hdnArt.value = '15';
    }

    return {
      selectVal: select?.value,
      artVal: art?.value,
      rateVal: document.getElementById('Line10WithholdingRate')?.value
    };
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  console.log('Result:', JSON.parse(msg).result.result.value);
  ws.close();
  process.exit(0);
});
