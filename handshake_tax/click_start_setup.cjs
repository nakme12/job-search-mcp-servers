const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/1FCB69868E3DC4D66333179B09D7B130');

ws.on('open', () => {
  const code = `(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Start setup'));
    if (btn) {
      btn.click();
      return 'Clicked Start setup';
    }
    return 'Button not found';
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  console.log('Result:', JSON.parse(msg).result.result.value);
  ws.close();
  process.exit(0);
});
