const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/9F9016A36E57A6A9C58587FD8906B212');

ws.on('open', () => {
  const code = `(() => {
    const err = document.querySelector('.error, [class*="error"], [style*="color: red"], [style*="color: rgb(255"]');
    const select = document.getElementById('Line10TypeOfIncomeId');
    return {
      selectValue: select?.value,
      selectClasses: select ? Array.from(select.classList) : [],
      parentHTML: select?.parentElement?.outerHTML
    };
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  console.log(JSON.stringify(JSON.parse(msg).result.result.value, null, 2));
  ws.close();
  process.exit(0);
});
