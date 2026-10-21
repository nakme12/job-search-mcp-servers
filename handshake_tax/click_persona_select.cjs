const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/E59FF0002DAA7AB6B089ED53A8D8E863');

ws.on('open', () => {
  const code = `(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Select');
    if (btn) {
      btn.click();
      return 'Clicked Select';
    }
    return 'Select button not found';
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  console.log('Result:', JSON.parse(msg).result.result.value);
  ws.close();
  process.exit(0);
});
