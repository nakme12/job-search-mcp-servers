const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/1FCB69868E3DC4D66333179B09D7B130');

ws.on('open', () => {
  const code = `(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Try again');
    if (btn) {
      btn.click();
      return 'Clicked Try again';
    }
    return 'Not found';
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  console.log('Result:', JSON.parse(msg).result.result.value);
  ws.close();
  process.exit(0);
});
